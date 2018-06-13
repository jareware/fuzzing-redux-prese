import { Map } from 'immutable';
import { DIVISION_ID, invoke, OTHER_DIVISION_ID, AugmentedCheerio } from 'fuzzer/utils/setup';
import { BoundGetters, bindGetters } from 'fuzzer/utils/getters';
import { sample, random, slice, mapValues, range } from 'lodash';
import { App } from 'common/redux';
import { getCommittedPoolConfig, getCommittedPoolRoundConfig, getCommittedKoPhaseConfig } from 'schedules/core/division-content';
import { fromJS } from 'schedules/utils/dto';
import { assertEqual } from 'common/test';

export const bindSteps = (app: App, $: AugmentedCheerio, get: BoundGetters, divisionId = DIVISION_ID) => ({

  reconfigureDivisionSetup() {
    app.actions.editActions.divisionSetupUpdated([ divisionId, 'AmountOfTeams', random(2, 32) ]);
    app.actions.editActions.divisionSetupApplied(divisionId);
  },

  addNewPoolRound() {
    const existingRounds = get.visibleRoundIds();
    if (existingRounds.length >= 10) return; // let's not get excessive here
    app.actions.scheduleActions.newPoolRoundAdded(divisionId);
  },

  removeExistingPoolRound() {
    const roundId = sample(get.visibleRoundIds());
    if (!roundId) return; // nothing to do!
    app.actions.scheduleActions.poolRoundRemoved(roundId);
  },

  addKoPhaseIfMissing() {
    app.actions.scheduleActions.koPhaseAdded(divisionId);
  },

  removeExistingKoPhase() {
    app.actions.scheduleActions.koPhaseRemoved(divisionId);
  },

  toggleFirstRoundAndQd() {
    if (!get.visiblePoolRoundNames().length) return; // nothing to do!
    app.actions.scheduleActions.toggleFirstRoundAndQd(divisionId);
  },

  autoSeedTeamsToFirstRound() {
    const existingRounds = get.visibleRoundIds();
    if (!existingRounds.length) return;
    app.actions.scheduleActions.unassignedTeamsAutoAssigned(divisionId);
  },

  resetTeamSeedingsForARound() {
    const roundId = sample(get.visibleRoundIds());
    if (!roundId) return; // nothing to do!
    const roundDto = app.stores.scheduleStore.getDto(roundId);
    app.actions.scheduleActions.teamAssignmentsResetByRound(roundDto);
  },

  reconfigurePoolRound() {
    const roundId = sample(get.visibleRoundIds());
    if (!roundId) return; // nothing to do!
    const roundDto = app.stores.scheduleStore.getDto(roundId);
    const currentCommittedDtoMap = app.stores.scheduleStore.getAllDtos();
    const currentConfig = getCommittedPoolRoundConfig(currentCommittedDtoMap, roundDto);
    app.actions.formStateActions.startRoundEdit(currentConfig);
    app.actions.formStateActions.roundEditModified(
      currentConfig.merge({
        numberOfPools: random(1, 5),
        numberOfTeams: random(2, 20),
      }),
    );
    app.actions.formStateActions.editFinished();
  },

  reconfigureIndividualPool() {
    const groupId = sample(get.visiblePoolGroupIds());
    if (!groupId) return; // nothing to do!
    const groupDto = app.stores.scheduleStore.getDto(groupId);
    const currentCommittedDtoMap = app.stores.scheduleStore.getAllDtos();
    const currentConfig = getCommittedPoolConfig(currentCommittedDtoMap, groupDto);
    app.actions.formStateActions.startPoolEdit(currentConfig);
    app.actions.formStateActions.poolEditModified(
      currentConfig.merge({
        numberOfTeams: random(2, 20),
      }),
    );
    app.actions.formStateActions.editFinished();
  },

  reconfigureKoRound() {
    if (!get.koRoundExists()) return; // nothing to do!
    const divisionDto = app.stores.scheduleStore.getDto(divisionId);
    const currentCommittedDtoMap = app.stores.scheduleStore.getAllDtos();
    const currentConfig = getCommittedKoPhaseConfig(currentCommittedDtoMap, divisionDto);
    app.actions.formStateActions.startRoundEdit(currentConfig);
    app.actions.formStateActions.roundEditModified(
      currentConfig.merge({
        numberOfTeams: random(2, 128),
        losersBracketSize: random(1, 15),
      }),
    );
    app.actions.formStateActions.editFinished();
  },

  splitDirectStandings() {
    const splits = get.possibleDirectStandingsSplits();
    const split = sample<typeof splits>(splits);
    if (!split) return; // no split options available
    app.actions.editActions.directStandingGroupSplit.apply(null, split.toArray());
  },

  mergeDirectStandings() {
    const merges = get.possibleDirectStandingsMerges();
    const merge = sample<typeof merges>(merges);
    if (!merge) return; // no split options available
    app.actions.editActions.directStandingGroupsMerged.apply(null, merge.toArray());
  },

  moveDirectStandings() {
    const moves = get.possibleDirectStandingsOrderChanges();
    const move = sample<typeof moves>(moves);
    if (!move) return; // no move options available
    app.actions.scheduleActions.standingGroupOrderChanged.apply(null, move.toArray());
  },

  dragThingsAround() {
    const selections = get.availableSelectables();
    const start = random(0, selections.length - 1);
    const end = random(start + 1, selections.length - 1);
    slice(selections, start, end).forEach(invoke);
    const dragEndAt = sample(
      get.availableDropTargets()
        .concat(
          fromJS.DropTargetModel({ // i.e. in a random place on the "screen" (could be hit or miss)
            top: random(0, 1000),
            left: random(0, 1000),
          }),
        ),
    );
    app.actions.dragActions.dropTargetsUpdated(get.availableDropTargets());
    app.actions.dragActions.activeDragMoved([ dragEndAt.left + 1, dragEndAt.top + 1 ]);
    app.actions.dragActions.activeDragEnded();
  },

  fuzzUnrelatedDivision() {
    const originalGetterValues = invokeAllGetters(get);
    const otherStepCount = random(1, 20); // how many steps to take in the "other division"
    const otherGetters = bindGetters(app, $, OTHER_DIVISION_ID);
    const otherSteps = bindSteps(app, $, otherGetters, OTHER_DIVISION_ID);
    delete otherSteps.fuzzUnrelatedDivision; // ensure we won't recurse multiple times
    const takeRandomStep = () => sample(otherSteps)();
    app.actions.routeActions.browserNavigated(`/categories/${OTHER_DIVISION_ID}/setup`); // navigate into the other division
    range(otherStepCount).forEach(takeRandomStep); // fuzz the other division for a bit
    app.actions.routeActions.browserNavigated(`/categories/${DIVISION_ID}/setup`); // navigate back
    const currentGetterValues = invokeAllGetters(get);
    assertEqual( // technically this should probably be in "invariants", but it'd make things unnecessarily complicated
      originalGetterValues,
      currentGetterValues, // check that nothing has changed in the "proper" division because we fuzzed the "other" division
    );
  },

});

// This is a tremendously ugly way to alias the inferred return type of the function.
// @see https://github.com/Microsoft/TypeScript/issues/14400
// Hopefully becomes unnecessary soon.
const temp = bindSteps(null as any, null as any, null as any);
export type BoundSteps = typeof temp;

function invokeAllGetters(getters: BoundGetters): Map<string, any> {
  return fromJS(
    mapValues(
      mapValues(getters, invoke), // invoke every getter
      (val, key) => { // drop some values which aren't easily comparable
        if (key === 'availableSelectables') return null; // this value won't be correct in case there's >1 app instance running
        return val;
      },
    ),
  );
}
