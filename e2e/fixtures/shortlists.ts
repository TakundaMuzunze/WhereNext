import type { Page } from "@playwright/test";

type List = { id: string; name: string; destinationIds: string[] };
export async function mockShortlists(page: Page, initial: List[] = [{ id: "summer", name: "Summer", destinationIds: ["lisbon-portugal"] }]) {
  const state = { signedIn: true, lists: structuredClone(initial), writes: 0, failNext: false, userId: "test-user" };
  await page.route("**/api/auth/sign-out", (route) => {
    state.signedIn = false;
    return route.fulfill({ json: { success: true } });
  });
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({
      json: state.signedIn
        ? {
            user: {
              id: state.userId,
              name: "Traveller",
              email: "test@example.com",
              emailVerified: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            session: {
              id: `${state.userId}-session`,
              userId: state.userId,
              token: "test",
              expiresAt: new Date(Date.now() + 86400000).toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }
        : null,
    }),
  );
  await page.route("**/api/shortlists", async (route) => {
    const method = route.request().method();
    if (!state.signedIn) return route.fulfill({ status: 401, json: { error: "Unauthorised" } });
    if (method === "GET")
      return route.fulfill({
        json: {
          userShortlists: state.lists.map((list) => ({
            id: list.id,
            shortlistName: list.name,
            _count: { shortlistItems: list.destinationIds.length },
            shortlistItems: list.destinationIds.map((destinationId) => ({ destinationId })),
          })),
        },
      });
    state.writes++;
    const body = route.request().postDataJSON();
    if (method === "DELETE") {
      state.lists = state.lists.filter((list) => list.id !== body.shortlistId);
      return route.fulfill({ json: { shortlistId: body.shortlistId } });
    }
    if (state.lists.some((list) => list.name.toLowerCase() === body.name?.trim().toLowerCase() && list.id !== body.shortlistId))
      return route.fulfill({ status: 409, json: { error: "A shortlist with that name already exists" } });
    if (method === "POST") {
      const list = { id: `list-${state.writes}`, name: body.name.trim(), destinationIds: [] };
      state.lists.push(list);
      return route.fulfill({ status: 201, json: { shortlist: { id: list.id, shortlistName: list.name } } });
    }
    const list = state.lists.find((item) => item.id === body.shortlistId);
    if (!list) return route.fulfill({ status: 404, json: { error: "Shortlist not found" } });
    list.name = body.name.trim();
    return route.fulfill({ json: { updatedShortlist: { id: list.id, shortlistName: list.name } } });
  });
  await page.route("**/api/shortlists/memberships", (route) => {
    state.writes++;
    if (!state.signedIn) return route.fulfill({ status: 401, json: { error: "Unauthorised" } });
    if (state.failNext) {
      state.failNext = false;
      return route.fulfill({ status: 500, json: { error: "Offline" } });
    }
    const body = route.request().postDataJSON();
    const addTo: string[] = body.addTo;
    const removeFrom: string[] = body.removeFrom;
    if ([...addTo, ...removeFrom].some((id) => !state.lists.some((list) => list.id === id)))
      return route.fulfill({ status: 404, json: { error: "Shortlist unavailable" } });
    let createdShortlist: { id: string; shortlistName: string } | undefined;
    if (body.createName) {
      if (state.lists.some((list) => list.name.toLowerCase() === body.createName.toLowerCase()))
        return route.fulfill({ status: 409, json: { error: "A shortlist with that name already exists" } });
      createdShortlist = { id: `list-${state.writes}`, shortlistName: body.createName };
      state.lists.push({ id: createdShortlist.id, name: body.createName, destinationIds: [body.destinationId] });
    }
    state.lists.forEach((list) => {
      if (addTo.includes(list.id) && !list.destinationIds.includes(body.destinationId)) list.destinationIds.push(body.destinationId);
      if (removeFrom.includes(list.id)) list.destinationIds = list.destinationIds.filter((id) => id !== body.destinationId);
    });
    const shortlistIds = state.lists.filter((list) => list.destinationIds.includes(body.destinationId)).map((list) => list.id);
    return route.fulfill({
      json: { destinationId: body.destinationId, shortlistIds, isSaved: shortlistIds.length > 0, ...(createdShortlist ? { createdShortlist } : {}) },
    });
  });
  return state;
}
