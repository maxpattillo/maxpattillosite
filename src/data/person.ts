/**
 * The canonical Person entity.
 *
 * This is the single source of truth for who the site is about. Every
 * component, meta tag, and JSON-LD block reads from it -- the name, title, and
 * links are never retyped elsewhere. That is what keeps the structured-data
 * graph internally consistent as the site grows.
 *
 * A personal authority site's equivalent of the "business entity" pattern: for
 * a local business this would be LocalBusiness with NAP data; here it is
 * schema.org/Person.
 */

export interface Organization {
  readonly name: string;
  readonly url: string;
}

/**
 * A social profile.
 *
 * ONE array drives two things: the visible links in the footer, and the
 * schema.org `sameAs` on every page. They are generated from the same source,
 * so the structured data can never claim a profile the site does not link to,
 * and adding a profile in one place cannot forget the other.
 */
export interface SocialProfile {
  /** Visible link text, e.g. 'LinkedIn'. Also used as the accessible name. */
  readonly label: string;
  /**
   * The CANONICAL profile URL — the one the platform itself resolves to.
   * For X use `https://x.com/<handle>`, not the twitter.com form, which
   * redirects. `sameAs` should point at the destination, not a hop.
   */
  readonly url: string;
}

export interface PersonEntity {
  readonly name: string;
  readonly givenName: string;
  readonly familyName: string;
  /**
   * One-sentence bio for the Person and WebSite JSON-LD and the feed. Not shown
   * on any page, so it claims nothing beyond what the pages already do.
   */
  readonly description: string;
  /*
   * The four below are optional, and left out while no page states them.
   * Schema must describe what the page shows; buildPerson() emits each one
   * only when it is present.
   */
  readonly jobTitle?: string;
  readonly email?: string;
  readonly worksFor?: Organization;
  /** Topics the person has demonstrable expertise in. Feeds `knowsAbout`. */
  readonly knowsAbout?: readonly string[];
  /**
   * Verified social profiles. Rendered in the footer AND emitted as
   * schema.org `sameAs`.
   *
   * Only add profiles that genuinely belong to this person and are actively
   * maintained. `sameAs` is an entity-resolution signal — search engines use
   * it to decide that this Person and those accounts are the same real
   * individual. A wrong URL is an active misidentification, and a dead profile
   * is a worse first impression than no profile.
   *
   * Order here is the order shown in the footer.
   */
  readonly socialProfiles: readonly SocialProfile[];
}

/*
 * Annotated with the interface rather than `as const satisfies`, so optional
 * properties absent from the literal still exist on the type.
 */
export const person: PersonEntity = {
  name: 'Max Pattillo',
  givenName: 'Max',
  familyName: 'Pattillo',
  description: 'Max Pattillo writes here sometimes.',
  /*
   * PERSONAL PROFILES ONLY. Everything here is asserted as identity -- it
   * feeds schema.org `sameAs` and the footer's rel="me" -- so the bar is "this
   * is the same human", not "this account has something to do with the Owner".
   * A CloseBot company account never belongs here: listing it would tell
   * search engines the company and the Owner are one entity.
   *
   * GitHub is the only profile so far. Add others as the Owner verifies them.
   */
  socialProfiles: [{ label: 'GitHub', url: 'https://github.com/maxpattillo' }],
};

/**
 * Profile URLs for schema.org `sameAs`, derived from `socialProfiles`.
 *
 * Derived rather than maintained separately: that is what guarantees the
 * structured data and the visible footer links describe the same set.
 */
export const sameAs: readonly string[] = person.socialProfiles.map((profile) => profile.url);
