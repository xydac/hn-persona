import { NextRequest, NextResponse } from "next/server";
import { fetchUser, fetchItems } from "@/lib/hn-api";
import { analyzeUser } from "@/lib/analyzer";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  try {
    const user = await fetchUser(username);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch up to 200 most recent items for analysis
    const itemIds = (user.submitted || []).slice(0, 200);
    const items = await fetchItems(itemIds);
    const profile = analyzeUser(user, items);

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json({ error: "Failed to analyze user" }, { status: 500 });
  }
}
