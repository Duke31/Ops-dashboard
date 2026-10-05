import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) || "contain"; // 'contain' | 'cover'
    const bgColor = (formData.get("bgColor") as string) || "#07193F";

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate image format
    const metadata = await sharp(buffer).metadata();
    if (!metadata.format) {
      return NextResponse.json({ error: "Invalid image file format" }, { status: 400 });
    }

    // 1. Process 512x512 Master Play Store & App Icon
    let master512: Buffer;
    if (mode === "cover") {
      master512 = await sharp(buffer)
        .resize(512, 512, { fit: "cover", position: "center" })
        .png()
        .toBuffer();
    } else {
      // Contain mode: center the image on the brand background color
      const resized = await sharp(buffer)
        .resize(460, 460, { fit: "inside" })
        .png()
        .toBuffer();

      master512 = await sharp({
        create: {
          width: 512,
          height: 512,
          channels: 4,
          background: bgColor,
        },
      })
        .composite([{ input: resized, gravity: "center" }])
        .png()
        .toBuffer();
    }

    // 2. Generate Adaptive Foreground (for Android 8+ Adaptive Icons)
    // Foreground should be centered with padding so Android circular/squircle mask doesn't clip
    const innerForeground = await sharp(buffer)
      .resize(300, 300, { fit: "inside" })
      .png()
      .toBuffer();

    const masterForeground432 = await sharp({
      create: {
        width: 432,
        height: 432,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: innerForeground, gravity: "center" }])
      .png()
      .toBuffer();

    // 3. Save to local web applet public folder
    const publicDir = path.join(process.cwd(), "public");
    const appDir = path.join(process.cwd(), "app");
    fs.writeFileSync(path.join(publicDir, "solace_logo.png"), master512);
    fs.writeFileSync(path.join(publicDir, "solace_icon.png"), master512);
    fs.writeFileSync(path.join(publicDir, "favicon.ico"), master512);
    fs.writeFileSync(path.join(appDir, "icon.png"), master512);

    // 4. Update Mobile App Repository
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "GITHUB_TOKEN is not configured on server" }, { status: 500 });
    }
    const repoUrl = `https://${token}@github.com/Duke31/Driver-mobile-app.git`;
    const tempDir = path.join("/tmp", `driver-repo-${Date.now()}`);

    execSync(`git clone --depth 1 "${repoUrl}" "${tempDir}"`, { stdio: "pipe" });

    // Generate all standard Android Mipmap densities
    const iconSizes = [
      { folder: "mipmap-mdpi", size: 48 },
      { folder: "mipmap-hdpi", size: 72 },
      { folder: "mipmap-xhdpi", size: 96 },
      { folder: "mipmap-xxhdpi", size: 144 },
      { folder: "mipmap-xxxhdpi", size: 192 },
    ];

    for (const item of iconSizes) {
      const destDir = path.join(tempDir, "android/app/src/main/res", item.folder);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      await sharp(master512)
        .resize(item.size, item.size)
        .png()
        .toFile(path.join(destDir, "ic_launcher.png"));
    }

    const fgSizes = [
      { folder: "mipmap-mdpi", size: 108 },
      { folder: "mipmap-hdpi", size: 162 },
      { folder: "mipmap-xhdpi", size: 216 },
      { folder: "mipmap-xxhdpi", size: 324 },
      { folder: "mipmap-xxxhdpi", size: 432 },
    ];

    for (const item of fgSizes) {
      const destDir = path.join(tempDir, "android/app/src/main/res", item.folder);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      await sharp(masterForeground432)
        .resize(item.size, item.size)
        .png()
        .toFile(path.join(destDir, "ic_launcher_foreground.png"));
    }

    // Save to flutter assets/images/
    const flutterAssetsDir = path.join(tempDir, "assets/images");
    if (!fs.existsSync(flutterAssetsDir)) fs.mkdirSync(flutterAssetsDir, { recursive: true });
    await sharp(master512).toFile(path.join(flutterAssetsDir, "solace_logo.png"));
    await sharp(master512).resize(192, 192).toFile(path.join(flutterAssetsDir, "solace_icon.png"));

    // Commit and push
    execSync(
      `cd "${tempDir}" && git config user.name "Duke31" && git config user.email "samuelfavour416@gmail.com" && git add . && git commit -m "feat(branding): update app icons from custom uploaded asset" && git push origin main`,
      { stdio: "pipe" },
    );

    // Clean up temporary clone
    execSync(`rm -rf "${tempDir}"`);

    return NextResponse.json({
      success: true,
      message: "Custom logo successfully applied and pushed to Driver-mobile-app repository!",
      repo: "Duke31/Driver-mobile-app",
      actionsUrl: "https://github.com/Duke31/Driver-mobile-app/actions",
    });
  } catch (err: unknown) {
    console.error("Error updating branding asset:", err);
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to process and deploy logo asset" },
      { status: 500 },
    );
  }
}
