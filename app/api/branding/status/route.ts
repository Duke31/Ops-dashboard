import { NextResponse } from "next/server";

export async function GET() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "GITHUB_TOKEN not configured" }, { status: 500 });
    }
    const res = await fetch("https://api.github.com/repos/Duke31/Driver-mobile-app/actions/runs?per_page=1", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch GitHub Actions status" }, { status: res.status });
    }

    const data = await res.json();
    const run = data.workflow_runs?.[0];

    if (!run) {
      return NextResponse.json({ status: "none" });
    }

    return NextResponse.json({
      id: run.id,
      status: run.status,
      conclusion: run.conclusion,
      commitMessage: run.head_commit?.message,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      htmlUrl: run.html_url,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error)?.message || "Server error" }, { status: 500 });
  }
}
