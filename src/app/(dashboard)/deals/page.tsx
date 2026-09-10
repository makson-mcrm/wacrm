// The existing pipeline board is the canonical list of qualified sales cases.
// Expose it under /deals as well so the mCRM AI desktop shell can distinguish
// everyday Deal work from the broader "Lejek" navigation entry without
// duplicating state, queries, or business logic.
export { default } from '../pipelines/page';

