/**
 * Copy for the Guinness World Records attempt.
 *
 * Everything here is behind the `gwrEnabled` flag, and with the flag off none of
 * it reaches the page: not this text, not the logo, not the JSON-LD, not the
 * emails. `scripts/check-integrity.mjs` fails the build if these strings appear
 * anywhere they could be rendered without the gate.
 *
 * ## The wording rule
 *
 * With the flag on, the only permitted claim is "Official Attempt". Never "world
 * record", never a record that has been set, never an implication that the
 * contest is already certified. Guinness has not adjudicated anything here, and
 * the contest has not happened.
 */

export const GWR = {
  /** Badge alt text. Informative, not decorative. */
  alt: 'Guinness World Records Official Attempt',

  /** Hero plate caption. */
  heroNote: 'Official Attempt',

  /** Rules page section heading. */
  rulesHeading: 'Guinness World Records attempt',

  /** Short paragraph for the rules page. */
  rulesIntro:
    'This contest is being run as an official attempt. The attempt will be submitted to Guinness World Records for adjudication. No record has been set or certified, and nothing on this page claims one has.',

  /** Confirmation email footer line. */
  emailFooter: 'Run as an official Guinness World Records attempt.',

  /** Placeholder shown in admin until the client supplies the details. */
  awaitingClientInput: 'Awaiting the record category, guidelines, adjudicator and attempt date from the client.',
} as const;

/**
 * Admin-only prompts for the details still outstanding.
 *
 * Rendered as an explicit list so nobody publishes the section without noticing
 * that these are still blank.
 */
export const GWR_CLIENT_INPUTS = [
  'The record category being attempted, and its published guidelines',
  'The adjudicator assigned by Guinness World Records',
  'The confirmed attempt date',
  'Confirmation that heart-rate scoring and the "deepest sleeper wins" format are compatible with those guidelines',
] as const;
