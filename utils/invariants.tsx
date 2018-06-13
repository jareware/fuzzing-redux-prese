import { parseTeamCardName, BoundGetters } from 'fuzzer/utils/getters';
import { assertEqual } from 'common/test';
import { List } from 'immutable';
import { range, flatten, last } from 'lodash';
import { sum } from 'schedules/utils/math';

export const bindInvariants = (get: BoundGetters) => ({

  eachRegularProgressionIsVisibleExactlyOnce() {
    const visibleTeamCardNames = get.visibleTeamCardNames();
    const expectedRegularProgressionCounts = get.expectedRegularProgressionsPerRound();
    const visibleRegularProgressionCards = List(visibleTeamCardNames)
      .map(parseTeamCardName)
      .filter(name => !!name.regularProgression)
      .groupBy(name => name.poolRoundName)
      .map(list => list.size)
      .toMap(); // to remove ordering
    assertEqual(
      expectedRegularProgressionCounts,
      visibleRegularProgressionCards,
    );
  },

  visiblePoolRoundHeadingsAreContiguous() {
    const names = get.visiblePoolRoundNames();
    if (names.length === 1) {
      assertEqual(
        names[0] === 'Pool Round' || names[0] === 'Qualifying Draw',
        true,
      );
    } else {
      if (names[0] === 'Qualifying Draw') names.shift(); // if the first round is a QD one, ignore it for this test
      assertEqual(
        names,
        range(1, names.length + 1).map(i => `Pool Round ${i}`),
      );
    }
  },

  eachPoolRoundContainsAsManySeedablePositionsAsItReportsHavingTeams() {
    const expectedPositionCounts = get.expectedRegularProgressionsPerRound();
    const visibleTeamCounts = get.visiblePoolRoundTeamCounts();
    assertEqual(
      expectedPositionCounts
        .toList()
        .map(num => `(${num} teams)`),
      visibleTeamCounts,
    );
  },

  allTeamsAreSomewhereOnTheScreen() {
    const actualTeams = List(get.teamsAvailableForSeeding())
      .sort();
    const visibleTeamCardNames = List(get.visibleTeamCardNames())
      .filter(teamName => actualTeams.includes(teamName))
      .sort();
    assertEqual(
      visibleTeamCardNames,
      actualTeams,
    );
  },

  koPhaseContainsCorrectSeedablePositions() {
    const teamCount = get.koRoundTeamCount();
    const expectedPositions = range(1, teamCount + 1)
      .map(i => `Seed ${i}`);
    const actualPositions = get.seedablePositionsInKoTree();
    assertEqual(
      actualPositions,
      expectedPositions,
    );
  },

  directStandingsAreContiguous() {
    const bounds = get.directStandingsBounds();
    const ubound = last(last(bounds));
    const expectedPositions = range(1, ubound + 1);
    const actualPositions = flatten(
      get.directStandingsBounds()
        .map(([ lo, hi ]) => range(lo, hi + 1)),
    );
    assertEqual(
      expectedPositions,
      actualPositions,
    );
  },

  correctNumberOfFinalStandings() {
    const divTeamCount = get.divisionTeamCount();
    const koTeamCount = get.koRoundTeamCount();
    const expectedTeamCount = Math.max(divTeamCount, koTeamCount);
    assertEqual(
      get.finalStandingsPositions()
        .reduce(sum, 0),
      expectedTeamCount,
    );
  },

  finalStandingsBoundsAddUp() {
    const bounds = get.directStandingsBounds();
    const boundsAsPositions = bounds.map(([ lo, hi ]) => hi - lo + 1);
    const positions = get.finalStandingsPositions();
    assertEqual( // that is, each Final Standings group contains as many positions as its bounds claim (QF 5-8 should contain 4, etc)
      boundsAsPositions,
      positions,
    );
  },

  summaryPanelGameCountsAreLegit() {
    assertEqual(
      get.visibleGameCards()
        .size,
      get.summarySidebarStats()
        .find(tuple => tuple.first() === 'Total games')
        .get(1),
    );
  },

  followUpGameIdsAreNotDeadEnds() {
    const deletedGameIds = get.deletedGameIds();
    get.followUpGameIds().forEach(gameId =>
      assertEqual(deletedGameIds.includes(gameId), false),
    );
  },

});

// This is a tremendously ugly way to alias the inferred return type of the function.
// @see https://github.com/Microsoft/TypeScript/issues/14400
// Hopefully becomes unnecessary soon.
const temp = bindInvariants(null as any);
export type BoundInvariants = typeof temp;
