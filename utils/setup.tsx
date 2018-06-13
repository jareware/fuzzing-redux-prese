import SchedulesUi from 'schedules/ui/SchedulesUi';
import { App } from 'common/redux';
import { createTestApp, createTestRenderer } from 'common/test';
import { fromJS, DtoMap } from 'schedules/utils/dto';
import { BaseDto, FluxActionModel } from 'schedules/core/records';
import { List } from 'immutable';
import { random } from 'lodash';
import { PROGRESS_MAIN_APP_DISPATCH, PROGRESS_FORKED_APP_DISPATCH } from 'fuzzer/fuzzer';

export type AugmentedCheerio = any;

export const EVENT_ID = '3fef3e1d-21b4-40c9-8987-fcb9c88b0a24';
export const DIVISION_ID = 'c3067cb7-6200-4559-b2e2-cdb5c73f1e5d';
export const OTHER_DIVISION_ID = '18b57df9-364e-4ebe-a218-95a5e0a62371';

export function prepareTestApp() {

  let dispatchedActions = List<FluxActionModel>();
  const app: App = createTestApp(undefined, action => {
    echo(PROGRESS_MAIN_APP_DISPATCH);
    dispatchedActions = dispatchedActions.push(action);
  });
  const $: AugmentedCheerio = createTestRenderer(SchedulesUi, app);

  app.actions.configActions.eventSelected(EVENT_ID);
  app.actions.routeActions.browserNavigated(`/categories/${DIVISION_ID}/setup`);
  app.actions.scheduleActions.fetchEventDataSucceeded(getInitialPayload());
  app.actions.editActions.divisionSetupUpdated([ DIVISION_ID, 'AmountOfTeams', random(2, 32) ]);
  app.actions.editActions.divisionSetupApplied(DIVISION_ID);
  app.actions.editActions.divisionSetupUpdated([ OTHER_DIVISION_ID, 'AmountOfTeams', random(2, 32) ]);
  app.actions.editActions.divisionSetupApplied(OTHER_DIVISION_ID);

  return {
    app,
    $,
    getDispatchedActions: () => dispatchedActions,
    runId: Date.now() + '',
  };

}

export const invoke = fn => fn();
export const echo = (char: string) => process.stdout.write(char);

export function ts(): string {
  return new Date().toISOString().replace(/.*T(.*)\..*/, '[$1]');
}

export function forkTestApp(app: App) {
  const app2: App = createTestApp(
    app['reduxStore'].getState(), // start the forked app from the cloned state of the main one
    () => echo(PROGRESS_FORKED_APP_DISPATCH),
  );
  const $2: AugmentedCheerio = createTestRenderer(SchedulesUi, app2);
  return { app2, $2 };
}

export function getInitialPayload(): DtoMap<BaseDto> {
  return fromJS({
    [EVENT_ID]: {
      REC_TYPE: 'EventDto',
      _dtoId: EVENT_ID,
      _eventStartDate: 1511863200000,
      _eventLength: 28800000,
      EventStatus: 'Created',
      EventId: EVENT_ID,
      EventName: 'Fuzz test event',
      EventIdentifier: null,
    },
    [DIVISION_ID]: {
      REC_TYPE: 'DivisionDto',
      _dtoId: DIVISION_ID,
      _eventId: EVENT_ID,
      DivisionId: DIVISION_ID,
      DivisionName: 'Category #1',
      DivisionGender: 'Female',
      DivisionClassificationType: 'Open',
      DivisionStatus: 'Created',
      TeamLimit: 6,
      CurrentTeamsRegistered: 6,
      ScheduleCreatedBy: 'NotScheduledYet',
      ProgressingSetupData: [],
      DivisionSeedingData: null,
      ScheduleSettings: {
        REC_TYPE: 'ScheduleSettingsModel',
        AdditionalCustomJsonData: {
          REC_TYPE: 'AdditionalCustomJsonDataModel',
          koRoundFormat: null,
          lowestPlacementRound: 'F',
          with3rdPlaceGame: false,
          defaultGameLength: 1200000,
          amountOfTeamsProgressing: null,
          seedingOrder: 'SEEDING_ORDER_SNAKE',
          customOpponentsSelected: false,
          amountOfDrawPools: 0,
          amountOfDrawTeams: 2,
          amountOfTeamsPerDrawPool: null,
          amountOfTeamsProgressingDirectly: null,
          scheduleRegeneratedWithRev: null,
          directStandingData: [],
          leagueModeActive: false,
        },
        AmountOfPools: null,
        AmountOfTeams: 0,
        AmountOfTeamsPerPool: 0,
        FirstKORound: 'Unknown',
        ScheduleType: null,
      },
    },
    '021277f9-9835-4744-a3c8-e58f04819e2b': {
      REC_TYPE: 'TeamDto',
      _dtoId: '021277f9-9835-4744-a3c8-e58f04819e2b',
      TeamId: '021277f9-9835-4744-a3c8-e58f04819e2b',
      DivisionId: DIVISION_ID,
      TeamName: 'Team #6',
      TeamRankingPoints: 0,
    },
    '79db4149-ecfd-416c-80f4-9812784bdee4': {
      REC_TYPE: 'TeamDto',
      _dtoId: '79db4149-ecfd-416c-80f4-9812784bdee4',
      TeamId: '79db4149-ecfd-416c-80f4-9812784bdee4',
      DivisionId: DIVISION_ID,
      TeamName: 'Team #5',
      TeamRankingPoints: 0,
    },
    '6f96fed7-390f-4f16-b745-d4353e63349c': {
      REC_TYPE: 'TeamDto',
      _dtoId: '6f96fed7-390f-4f16-b745-d4353e63349c',
      TeamId: '6f96fed7-390f-4f16-b745-d4353e63349c',
      DivisionId: DIVISION_ID,
      TeamName: 'Team #4',
      TeamRankingPoints: 0,
    },
    'b5090219-5f8a-49c3-b9a8-5ecab93ddf49': {
      REC_TYPE: 'TeamDto',
      _dtoId: 'b5090219-5f8a-49c3-b9a8-5ecab93ddf49',
      TeamId: 'b5090219-5f8a-49c3-b9a8-5ecab93ddf49',
      DivisionId: DIVISION_ID,
      TeamName: 'Team #3',
      TeamRankingPoints: 0,
    },
    '4337b53b-92c3-4170-b0e0-7b32ac7f65cb': {
      REC_TYPE: 'TeamDto',
      _dtoId: '4337b53b-92c3-4170-b0e0-7b32ac7f65cb',
      TeamId: '4337b53b-92c3-4170-b0e0-7b32ac7f65cb',
      DivisionId: DIVISION_ID,
      TeamName: 'Team #1',
      TeamRankingPoints: 0,
    },
    'ec51d242-87b6-4758-8d01-e37fecb79777': {
      REC_TYPE: 'CourtDto',
      _dtoId: 'ec51d242-87b6-4758-8d01-e37fecb79777',
      _eventId: EVENT_ID,
      CourtId: 'ec51d242-87b6-4758-8d01-e37fecb79777',
      Name: 'Court #01',
    },
    'fff10bf7-5ac3-486d-ac0b-153ce5f301fc': {
      REC_TYPE: 'TeamDto',
      _dtoId: 'fff10bf7-5ac3-486d-ac0b-153ce5f301fc',
      TeamId: 'fff10bf7-5ac3-486d-ac0b-153ce5f301fc',
      DivisionId: DIVISION_ID,
      TeamName: 'Team #2',
      TeamRankingPoints: 0,
    },
    [OTHER_DIVISION_ID]: {
      REC_TYPE: 'DivisionDto',
      _dtoId: OTHER_DIVISION_ID,
      _eventId: EVENT_ID,
      DivisionId: OTHER_DIVISION_ID,
      DivisionName: 'Category #2',
      DivisionGender: 'Female',
      DivisionClassificationType: 'Open',
      DivisionStatus: 'Created',
      TeamLimit: 3,
      CurrentTeamsRegistered: 3,
      ScheduleCreatedBy: 'NotScheduledYet',
      ProgressingSetupData: [],
      DivisionSeedingData: null,
      ScheduleSettings: {
        REC_TYPE: 'ScheduleSettingsModel',
        AdditionalCustomJsonData: {
          REC_TYPE: 'AdditionalCustomJsonDataModel',
          koRoundFormat: null,
          lowestPlacementRound: 'F',
          with3rdPlaceGame: false,
          defaultGameLength: 1200000,
          amountOfTeamsProgressing: null,
          seedingOrder: 'SEEDING_ORDER_SNAKE',
          customOpponentsSelected: false,
          amountOfDrawPools: 0,
          amountOfDrawTeams: 2,
          amountOfTeamsPerDrawPool: null,
          amountOfTeamsProgressingDirectly: null,
          scheduleRegeneratedWithRev: null,
          directStandingData: [],
          leagueModeActive: false,
        },
        AmountOfPools: null,
        AmountOfTeams: 0,
        AmountOfTeamsPerPool: 0,
        FirstKORound: 'Unknown',
        ScheduleType: null,
      },
    },
    'f169cbae-f6aa-40e0-8082-77527e5a0715': {
      REC_TYPE: 'TeamDto',
      _dtoId: 'f169cbae-f6aa-40e0-8082-77527e5a0715',
      TeamId: 'f169cbae-f6aa-40e0-8082-77527e5a0715',
      DivisionId: OTHER_DIVISION_ID,
      TeamName: 'Team #1001',
      TeamRankingPoints: 12412,
    },
    'e1b6e79c-6cd9-4176-83e6-201870fdee45': {
      REC_TYPE: 'TeamDto',
      _dtoId: 'e1b6e79c-6cd9-4176-83e6-201870fdee45',
      TeamId: 'e1b6e79c-6cd9-4176-83e6-201870fdee45',
      DivisionId: OTHER_DIVISION_ID,
      TeamName: 'Team #1002',
      TeamRankingPoints: 564,
    },
    'c8467b62-9ebe-4098-beca-61e91ce60466': {
      REC_TYPE: 'TeamDto',
      _dtoId: 'c8467b62-9ebe-4098-beca-61e91ce60466',
      TeamId: 'c8467b62-9ebe-4098-beca-61e91ce60466',
      DivisionId: OTHER_DIVISION_ID,
      TeamName: 'Team #1003',
      TeamRankingPoints: 40985,
    },
  });
}
