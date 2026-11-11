export async function POST() {
  // Keep old clients from starting flight-led searches or spending provider capacity.
  return Response.json({ status: "retired", plannerUrl: "/planner" }, { status: 410, headers: { "Cache-Control": "private, no-store" } });
}
