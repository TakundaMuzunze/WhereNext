# Dated trip request contract

Status: input rules accepted; schema, URL parsing and additive planning/review flow implemented. This document records the input contract, not a copy of the delivery ticket. See [issue #37](https://github.com/TakundaMuzunze/WhereNext/issues/37) and the [feature specification](spec.md).

## Purpose and boundaries

`DatedTripRequest` describes a completed dated group holiday request. It is separate from the legacy `PlannerAnswers`, which also represents unfinished form fields. The dated form keeps unfinished values as strings and validates them before creating this type.

The type does not validate external input. Dates, numbers and activity strings still require runtime validation before creating a request from a form or URL. Both boundaries use the same Zod schema. The completed TypeScript type is inferred from that schema. Validation receives today’s Europe/London calendar date at the boundary, rather than capturing it when the module loads.

## Input rules

These accepted limits are application policies, not verified provider limits.

| Input                | Meaning and validation                                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Request kind         | Literal `dated`; distinguishes the new request from existing month-based planner URLs.                                                                                                                       |
| Departure airport    | `LHR` (London Heathrow) or `MAN` (Manchester). Both appeared in feasibility work. Store an airport code, never infer it from unrestricted departure text. These choices do not guarantee route availability. |
| Outbound date        | Real Gregorian calendar date, exactly `YYYY-MM-DD`. On or after today's date in Europe/London and at most 365 calendar days ahead. Inject today's date into validation so tests are deterministic.           |
| Return date          | Same date format, strictly after outbound. Stay length from 1 to 28 nights. A return may fall beyond the outbound date horizon.                                                                              |
| Adults               | Integer from 1 to 9. Adults only, economy travel; children and infants are outside this scope.                                                                                                               |
| Currency             | GBP only.                                                                                                                                                                                                    |
| Group holiday budget | Total for all adults, including flights, accommodation and local spending. Integer pence from 100 (£1) to 10,000,000 (£100,000).                                                                             |
| Daily allowance      | Per adult per spending day, for meals, local transport and activities. Integer pence from 0 to 100,000 (£1,000); zero is valid and means no allowance is included.                                           |
| Trip type            | One existing `TripType`; an empty selection is invalid. Reuse the current options for this slice, without asserting they are all supported by future evidence matching.                                      |
| Activities           | At least one existing activity for the selected trip type. Reject unknown or incompatible activities; remove duplicates. Maximum is the number of activities offered by that trip type.                      |

Money enters the UI as pounds with at most two decimal places and becomes integer pence at the parsing boundary. Reject negative values, non-finite numbers, fractions of a penny and values over the limits. Do not silently round malformed input. Integer pence avoids using floating-point pounds for later cost arithmetic.

The allowance may exceed the group budget: retain the request and explain that the allowance alone exceeds the budget. This is an affordability outcome, not malformed input.

## Derived duration

Calculate nights as the calendar-day difference between return and outbound dates. Spending days include both departure and return days, so spending days equal nights plus one. Do not divide elapsed local milliseconds by 24 hours: daylight-saving changes must not change a calendar-day count.

For example, 10–14 November means four nights and five spending days. Two adults at £50 each per day allocate £500 to spending, already included within the group budget.

Neither duration nor travel month is independently editable or stored on `DatedTripRequest`. Derive them when needed. This is a planning convention; it does not establish flight arrival dates or actual accommodation check-in/out dates for overnight routes.

## Destination scope

Initially allow destination country codes `FR`, `ES`, `PT`, `IT`, `GR` and `MT` (France, Spain, Portugal, Italy, Greece and Malta). This deliberately bounded launch scope is not a definition of Europe or a provider coverage claim. Domestic UK destinations are excluded. Destination discovery must apply its own country filter; a provider's Europe region alone is insufficient.

Country scope belongs to destination discovery policy, not a traveller-supplied field in this request. Routes and accommodation availability remain unverified until the relevant provider slice.

## URL compatibility and integration

Keep the existing planner parser, serializer and URLs working. The new format uses `kind=dated`; that marker selects the new parser and must not fall back to legacy parsing after a dated validation failure. URLs without it continue through the legacy path. Reject unknown or repeated kind values.

For dated URLs, reject legacy `month`, `duration`, `departure`, `budget` and `travellers` parameters rather than allowing conflicting values to override the new fields. Use explicit parameter names matching the new request fields, and repeated `activity` parameters for activities. Preserve unrelated navigation/sign-in parameters.

The entry point is `/planner?kind=dated`, also linked from the existing planner. `/results?kind=dated&...` displays a review rather than running the legacy ranking engine. Its optional destination guides are scoped to the countries above and explicitly have no airport, date, price or preference assessment. The current catalogue does not contain guides in every supported country.

Completed requests survive edit links, browser Back, reload, destination navigation and the existing sign-in continuation. Submitting also updates the planner history entry to retain the completed request. Unsubmitted edits are retained in the planner URL with `draft=1`, including empty fields and invalid numeric input. Drafts survive reload, browser Back, navigation and sign-in return. Draft parsing checks the editable shape and supported choices without treating it as a completed request. Full request validation is still required on submission, which replaces the draft URL with a completed request. Expired or malformed dated URLs show recovery rather than falling back to legacy ranking. URL validation uses the current date, so old requests may expire.

Focused tests cover schema rules, calendar boundaries, pound conversion, serialization and repeated/conflicting URL fields. Browser tests cover review/edit, guide navigation, sign-in cancellation, invalid input and mobile overflow alongside existing journeys. No live prices or persistence are introduced.
