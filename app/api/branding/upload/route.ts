import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

interface FileEntry {
  path: string;
  buffer: Buffer;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) || "contain";
    const bgColor = (formData.get("bgColor") as string) || "#07193F";

    // Allow token from header, form body, or environment variable
    const token =
      (formData.get("githubToken") as string) ||
      req.headers.get("x-github-token") ||
      process.env.GITHUB_TOKEN;

    if (!token) {
      return NextResponse.json(
        {
          error:
            "GitHub token not found. Please provide a GitHub Personal Access Token or add GITHUB_TOKEN to your Vercel Environment Variables.",
        },
        { status: 401 },
      );
    }

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate image format with sharp in-memory
    const metadata = await sharp(buffer).metadata();
    if (!metadata.format) {
      return NextResponse.json({ error: "Invalid image file format" }, { status: 400 });
    }

    // 1. Process Master Icon - Support 'original' mode (Zero alterations, transparent background)
    let master512: Buffer;
    let masterForeground432: Buffer;

    if (mode === "original") {
      // 100% UNALTERED: keep exact image, exact transparency, zero artificial background or margins
      master512 = await sharp(buffer)
        .resize(512, 512, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();

      masterForeground432 = await sharp(buffer)
        .resize(432, 432, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
    } else if (mode === "cover") {
      master512 = await sharp(buffer)
        .resize(512, 512, { fit: "cover", position: "center" })
        .png()
        .toBuffer();

      masterForeground432 = await sharp(buffer)
        .resize(432, 432, { fit: "cover", position: "center" })
        .png()
        .toBuffer();
    } else {
      // Contain mode with chosen background color
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

      const innerForeground = await sharp(buffer)
        .resize(320, 320, { fit: "inside" })
        .png()
        .toBuffer();

      masterForeground432 = await sharp({
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
    }

    // 3. Prepare all Android Mipmap densities in-memory (No disk writes!)
    const filesToUpload: FileEntry[] = [];

    // Master logos for flutter assets
    filesToUpload.push({
      path: "assets/images/solace_logo.png",
      buffer: master512,
    });

    const icon192 = await sharp(master512).resize(192, 192).png().toBuffer();
    filesToUpload.push({
      path: "assets/images/solace_icon.png",
      buffer: icon192,
    });

    // Android launcher icons
    const iconDensities = [
      { folder: "mipmap-mdpi", size: 48 },
      { folder: "mipmap-hdpi", size: 72 },
      { folder: "mipmap-xhdpi", size: 96 },
      { folder: "mipmap-xxhdpi", size: 144 },
      { folder: "mipmap-xxxhdpi", size: 192 },
    ];

    for (const d of iconDensities) {
      const buf = await sharp(master512).resize(d.size, d.size).png().toBuffer();
      filesToUpload.push({
        path: `android/app/src/main/res/${d.folder}/ic_launcher.png`,
        buffer: buf,
      });
    }

    // Android launcher adaptive foregrounds
    const fgDensities = [
      { folder: "mipmap-mdpi", size: 108 },
      { folder: "mipmap-hdpi", size: 162 },
      { folder: "mipmap-xhdpi", size: 216 },
      { folder: "mipmap-xxhdpi", size: 324 },
      { folder: "mipmap-xxxhdpi", size: 432 },
    ];

    for (const d of fgDensities) {
      const buf = await sharp(masterForeground432).resize(d.size, d.size).png().toBuffer();
      filesToUpload.push({
        path: `android/app/src/main/res/${d.folder}/ic_launcher_foreground.png`,
        buffer: buf,
      });
    }

    // 4. Push directly to GitHub using GitHub Git Data API (pure HTTP, zero CLI git, zero local disk writes)
    const owner = "Duke31";
    const repo = "Driver-mobile-app";
    const authHeaders = {
      Authorization: `token ${token.trim()}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Ops-Dashboard",
    };

    // Step A: Get current commit SHA of main branch
    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`,
      { headers: authHeaders, cache: "no-store" },
    );

    if (!refRes.ok) {
      const refErr = await refRes.text();
      return NextResponse.json(
        { error: `GitHub API error fetching branch: ${refRes.status} ${refErr}` },
        { status: refRes.status },
      );
    }

    const refData = await refRes.json();
    const latestCommitSha = refData.object.sha;

    // Step B: Get current tree SHA from latest commit
    const commitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
      { headers: authHeaders, cache: "no-store" },
    );
    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    // Step C: Create blobs for each file
    const treeItems: Array<{ path: string; mode: string; type: string; sha: string }> = [];

    for (const f of filesToUpload) {
      const blobRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            content: f.buffer.toString("base64"),
            encoding: "base64",
          }),
        },
      );

      if (!blobRes.ok) {
        const bErr = await blobRes.text();
        throw new Error(`Failed to upload blob for ${f.path}: ${bErr}`);
      }

      const blobData = await blobRes.json();
      treeItems.push({
        path: f.path,
        mode: "100644",
        type: "blob",
        sha: blobData.sha,
      });
    }

    // Step D: Create new tree with all updated assets
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeItems,
        }),
      },
    );

    if (!treeRes.ok) {
      const tErr = await treeRes.text();
      throw new Error(`Failed to create git tree: ${tErr}`);
    }

    const treeData = await treeRes.json();

    // Step E: Create commit
    const newCommitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits`,
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          message: "feat(branding): update app icons from custom uploaded asset",
          tree: treeData.sha,
          parents: [latestCommitSha],
        }),
      },
    );

    if (!newCommitRes.ok) {
      const cErr = await newCommitRes.text();
      throw new Error(`Failed to create git commit: ${cErr}`);
    }

    const newCommitData = await newCommitRes.json();

    // Step F: Update main branch reference to trigger GitHub Actions APK build
    const updateRefRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`,
      {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          sha: newCommitData.sha,
          force: false,
        }),
      },
    );

    if (!updateRefRes.ok) {
      const uErr = await updateRefRes.text();
      throw new Error(`Failed to update branch ref: ${uErr}`);
    }

    return NextResponse.json({
      success: true,
      commitSha: newCommitData.sha,
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
