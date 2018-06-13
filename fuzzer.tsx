import { prepareTestApp, ts, invoke, echo } from 'fuzzer/utils/setup';
import { bindGetters } from 'fuzzer/utils/getters';
import { bindSteps } from 'fuzzer/utils/steps';
import { bindInvariants } from 'fuzzer/utils/invariants';
import { sample, defer, each } from 'lodash';
import { writeCodeToReproduce, simplifyErrorMessage, expandErrorMessage } from 'fuzzer/utils/repro';

export const PROGRESS_TAKING_NEXT_STEP    = '|';
export const PROGRESS_CHECKING_INVARIANTS = '=';
export const PROGRESS_MAIN_APP_DISPATCH   = ':';
export const PROGRESS_FORKED_APP_DISPATCH = '.';

export const GREEN_TICK = '\x1b[1;32m✓\x1b[0m';
export const YELLOW_TICK = '\x1b[1;33m✓\x1b[0m';
export const RED_CROSS = '\x1b[1;31m✗\x1b[0m';

const STEPS_PER_RUN = parseInt(process.argv[2], 10) || 255;

main();

function main() {
  return run().then(main);
}

function run() {
  echo(`Setting up test:\n\n${ts()} `);
  const { app, $, getDispatchedActions, runId } = prepareTestApp();
  const getters = bindGetters(app, $);
  const steps = bindSteps(app, $, getters);
  const invariants = bindInvariants(getters);
  const getActionCount = () => getDispatchedActions().size;
  let keepStepping = STEPS_PER_RUN;
  echo(`\n\nRunning fuzz test #${runId} for ${keepStepping} steps:\n\n${ts()} `);
  return new Promise(resolve => {
    takeNextStep();
    function takeNextStep() {
      try {
        // Choose and take a random step:
        echo(PROGRESS_TAKING_NEXT_STEP);
        const prevActionCount = getActionCount();
        sample(steps)();
        const nextActionCount = getActionCount();
        if (nextActionCount === prevActionCount) {
          return defer(takeNextStep); // the step dispatched nothing -> no point in further checks
        }
        // Run all invariant checks:
        echo(PROGRESS_CHECKING_INVARIANTS);
        each(invariants, invoke);
        // Decide whether to keep going or if we're finished with this run:
        if (keepStepping--) {
          defer(takeNextStep); // schedule next step
        } else {
          echo(` ${GREEN_TICK} reached step limit of ${STEPS_PER_RUN} (dispatched ${getDispatchedActions().size} actions)\n\n`);
          resolve(); // reached step limit
        }
      } catch (err) {
        // Report the error that was found:
        echo(` ${RED_CROSS} got error: ${simplifyErrorMessage(err)}\n\n`);
        writeCodeToReproduce(err, runId, getDispatchedActions());
        echo(`\nOriginal error was: ${expandErrorMessage(err)}\n\n`);
        resolve(); // done with this run
      }
    }
  });
}
