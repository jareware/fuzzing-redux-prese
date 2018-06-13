import { fromJS } from 'schedules/utils/dto';
import { App } from 'common/redux';
import { OrderedMap } from 'immutable';
import { List, Set } from 'immutable';
import { DropTargetModel, assertIs, is, EventMakerPoolDirectProgressionModel, EventMakerDirectProgressionModel, GameDto } from 'schedules/core/records';
import { AugmentedCheerio, getInitialPayload, DIVISION_ID, forkTestApp } from 'fuzzer/utils/setup';
import { Tuple3 } from 'schedules/utils/types';
import { availableDragTargetSelections } from 'schedules/ui/utils/DragTarget';
import { clone, matches } from 'lodash';
import { isNotDeleted } from 'schedules/core/scheduling';

type DropTargetType = DropTargetModel['dropTargetType'];

export const bindGetters = (app: App, $: AugmentedCheerio, divisionId = DIVISION_ID) => ({

  // @example [ "Pool Round" ]
  // @example [ "Pool Round 1", "Pool Round 2" ]
  visiblePoolRoundNames(): string[] {
    return $.toEls('.DivisionPreviewPanel-round:not(.DivisionPreviewPanel-koRound) .SubHeading-title')
      .map(el => el.text());
  },

  // @example [ "(5 teams)", "(8 teams)" ]
  visiblePoolRoundTeamCounts(): string[] {
    return $.toEls('.DivisionPreviewPanel-round:not(.DivisionPreviewPanel-koRound) .SubHeading-addendum')
      .map(el => el.text());
  },

  // @example OrderedMap { "PR 1": 6, "PR 2": 4 }
  expectedRegularProgressionsPerRound(): OrderedMap<string, number> {
    return OrderedMap(
      $.toEls('.DivisionPreviewPanel-round[data-round-short-name]')
        .map(el => ({
          [el.data('roundShortName')]: el.find('.DivisionPreviewPanel-seedablePosition').length,
        }))
        .reduce((memo, next) => Object.assign(memo, next), {}),
    );
  },

  // @example "Team #6"
  // @example "A/II"
  // @example "Final 1 winner"
  visibleTeamCardNames(): string[] {
    return $.toEls('.TeamCard-name')
      .map(el => el.text());
  },

  // @example [ "123-456-789" ]
  visibleRoundIds(): string[] {
    return $.toEls('.DivisionPreviewPanel-round[data-round-id]')
      .map(el => el.data('roundId'));
  },

  // @example [ "123-456-789" ]
  visiblePoolGroupIds(): string[] {
    return $.toEls('.DivisionPreviewPanel-pool[data-group-id]')
      .map(el => el.data('groupId'));
  },

  // @example [ DropTargetModel { dropTargetType: "DROP_TARGET_POOL", ... } ]
  availableDropTargets(): DropTargetModel[] {
    return $.toEls('*[data-drop-target-type]')
      .map(el => ({
        dropTargetType: el.data('dropTargetType') as DropTargetType,
        dropTargetMeta: el.data('dropTargetMeta'),
      }))
      .map(({ dropTargetType, dropTargetMeta }, i) => fromJS.DropTargetModel({
        dropTargetType,
        dropTargetMeta,
        top: i * 10,
        left: 0,
        width: 10,
        height: 10,
      }));
  },

  // @example [ () => app.actions.editActions.progressionSelectionToggled("round#1,group#1,1"), ... ]
  availableSelectables(): Array<() => void> {
    availableDragTargetSelections.splice(0, availableDragTargetSelections.length); // clear current available selections, because it contains stuff from previous runs
    app.bootstrap('{}'); // this is effectively a no-op action to trigger a re-render of all components that might host instances of <DragTarget>
    return clone(availableDragTargetSelections); // clone the list of callbacks the above render produced (because otherwise the ugly mutable state monster would get us!)
  },

  // @example [ "Team #1", "Team #2" ]
  teamsAvailableForSeeding(): string[] {
    return getInitialPayload()
      .filter(is.TeamDto)
      .filter(team => team.DivisionId === divisionId)
      .map(team => team.TeamName)
      .toArray();
  },

  // @example true
  koRoundExists(): boolean {
    return !!$('.DivisionPreviewPanel-koRound').length;
  },

  // @example 0
  // @example 8
  koRoundTeamCount(): number {
    return parseInt(
      $('.DivisionPreviewPanel-koRound .SubHeading-addendum')
        .text()
        .replace(/[^\d]/g, ''),
      10,
    ) || 0;
  },

  // @example [ "Seed 1", "Seed 2", "Seed 3" ]
  seedablePositionsInKoTree(): string[] {
    return sortByNumericComponent(
      $.toEls('.DivisionPreviewPanel-koRound .DivisionPreviewPanel-seedablePosition')
        .map(el => el.text()),
    );
  },

  // @example 8
  divisionTeamCount() {
    return assertIs.DivisionDto(app.stores.scheduleStore.getDto(divisionId)).ScheduleSettings.AmountOfTeams;
  },

  // @example [ [ 1, 2 ], [ 3, 4 ] ]
  directStandingsBounds(): Array<[ number, number ]> {
    return $.toEls('.DivisionStandingPanel-directStanding .SubHeading-text')
      .map(el =>
        el.text() // e.g. "Final Standings 1 - 2 (Final)", or "Final Standing 3"
          .replace(/.*Final Standings (\d+) - (\d+).*/, '$1 $2')
          .replace(/.*Final Standing (\d+).*/, '$1 $1')
          .split(' ')
          .map(num => parseInt(num, 10)),
      );
  },

  possibleDirectStandingsSplits(): List<Tuple3<string, EventMakerPoolDirectProgressionModel, number>> {
    return $.toEls('*[data-direct-standing-group-split]')
      .map(el => el.data('directStandingGroupSplit'))
      .map(split => fromJS(split));
  },

  possibleDirectStandingsMerges(): List<Tuple3<string, EventMakerPoolDirectProgressionModel, EventMakerDirectProgressionModel>> {
    return $.toEls('*[data-direct-standing-group-merge]')
      .map(el => el.data('directStandingGroupMerge'))
      .map(merge => fromJS(merge));
  },

  possibleDirectStandingsOrderChanges(): List<List<any>> { // the type is variable
    return $.toEls('*[data-standing-group-order-change]')
      .map(el => el.data('standingGroupOrderChange'))
      .map(merge => fromJS(merge));
  },

  // @example [ 2, 2, 8, ... ]
  finalStandingsPositions(): number[] {
    return $.toEls('.DivisionStandingPanel-directStandingPool') // go through each "Final Standings group"
      .map(($el): number => {
        const seedablePositions = $el.find('.DivisionStandingPanel-seedablePosition').length;
        const fixedPositions = $el.find('.TeamCard').length;
        return seedablePositions ? seedablePositions : fixedPositions; // if the group contains "seedable positions", count them, if not, count the "read-only" TeamCards that are there
      });
  },

  // @example [ "Pool A game 1", "Pool A game 2", ... ]
  visibleGameCards(): List<string> {
    const { app2, $2 } = forkTestApp(app);
    app2.actions.routeActions.browserNavigated(`categories/${divisionId}/games`); // go to Games tab
    return $2.toEls('.SelectedRoundDropdown.dropdown-menu a') // get URL's in the navi dropdown
      .map($el => $el.attr('href'))
      .map(url => {
        app2.actions.routeActions.browserNavigated(url);
        return $2.toEls('.GameCard-name')
          .map(el => el.text()) as string[];
      })
      .reduce((memo, next) => memo.concat(List(next)), List<string>());
  },

  // @example [ [ "Registrations", 6, "teams" ], ... ]
  summarySidebarStats(): List<Tuple3<string, number, string>> {
    const { app2, $2 } = forkTestApp(app);
    app2.actions.configActions.divisionStatsToggled();
    return fromJS(
      $2.toEls('.DivisionStatsPanel > :nth-child(2) .DivisionStatsPanel-tuple') // "Category Overview" part only
        .map($el => $el.text())
        .map(txt => txt.replace(/([0-9.]+)\s*/, '|$1|'))
        .map(txt => txt.split('|'))
        .map(parts => parts.map((v, i) => i === 1 ? parseFloat(v) : v.trim())),
    );
  },

  followUpGameIds(): Set<string> {
    return app.stores.scheduleStore.getAllDtos()
      .filter(is.GameDto)
      .filter(matches({ DivisionId: DIVISION_ID }))
      .map((gameDto: GameDto) => List.of(gameDto.FollowUpGameIdLoser, gameDto.FollowUpGameIdWinner))
      .toList()
      .flatten()
      .toSet();
  },

  deletedGameIds(): Set<string> {
    return app.stores.scheduleStore.getAllDtos()
      .filter(is.GameDto)
      .filterNot(isNotDeleted)
      .filter(matches({ DivisionId: DIVISION_ID }))
      .map((gameDto: GameDto) => gameDto.GameId)
      .toSet();
  },
});

// This is a tremendously ugly way to alias the inferred return type of the function.
// @see https://github.com/Microsoft/TypeScript/issues/14400
// Hopefully becomes unnecessary soon.
const temp = bindGetters(null as any, null as any);
export type BoundGetters = typeof temp;

function sortByNumericComponent(array: string[]): string[] {
  return List(array)
    .sortBy(str => parseInt(str.replace(/[^\d]/g, ''), 10))
    .toArray();
}

export function parseTeamCardName(name: string): {
  poolRoundName?: string,
  regularProgression?: string,
  bestProgression?: string,
  globalProgression?: string,
  followUpProgression?: string,
  teamName?: string,
} {
  let match = name.match(/^(PR \d+)?(?: - )?([A-Z]+\/[CDMXLCIV]+)$/);
  if (match) return {
    poolRoundName: match[1] || 'PR 1',
    regularProgression: match[2],
  };
  match = name.match(/^QD - ([A-Z]+\/[CDMXLCIV]+)$/);
  if (match) return {
    poolRoundName: 'QD',
    regularProgression: match[1],
  };
  match = name.match(/^(PR \d+)?(?: - )?(\d+)\w+ best$/);
  if (match) return {
    poolRoundName: match[1] || 'PR 1',
    bestProgression: match[2],
  };
  match = name.match(/^QD - (\d+)\w+ best$/);
  if (match) return {
    poolRoundName: 'QD',
    bestProgression: match[1],
  };
  match = name.match(/^(\d+)\w+ best from all pool rounds$/);
  if (match) return {
    globalProgression: match[1],
  };
  match = name.match(/^(.*) (winner|loser)$/);
  if (match) return {
    followUpProgression: match[1],
  };
  return {
    teamName: name,
  };
}
