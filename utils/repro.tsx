import { FluxActionModel } from 'schedules/core/records';
import { List, Map } from 'immutable';
import { writeFileSync } from 'fs';
import { isArray } from 'lodash';
import { inspect } from 'util';
import { echo } from 'fuzzer/utils/setup';

export function writeCodeToReproduce(err: Error, id: string, actions: List<FluxActionModel>): void {
  const file = `schedules/fuzz-${id}.tsx`;
  echo(`Wrote reproduce code to ${file}\n`);
  writeFileSync(file, `/*\n${expandErrorMessage(err)}\n*/\n` + getCodeToReproduce(actions));
}

function getCodeToReproduce(actions: List<FluxActionModel>): string {
  return `
    // APPLICATION SETUP:

    import 'schedules/utils/browserPointerInput';
    import SchedulesUi from 'schedules/ui/SchedulesUi';
    import { renderAppRoot } from 'common/react';
    import { fromJS } from 'schedules/utils/dto';
    import { createTestApp } from 'common/test';
    import { initOutsideClicks } from 'schedules/utils/browser';

    const app = createTestApp();

    window['app'] = app;
    window['fromJS'] = fromJS;

    initOutsideClicks(app);

    renderAppRoot(SchedulesUi, app, document.querySelector('#app-root'));

    // ACTION REPLAY:
    \n${serializeActions(actions).join('\n')}
  `;
}

function serializeActions(actions: List<FluxActionModel>): List<string> {
  return actions.map(action => `app.actions.${action.type}(${serializePayload(action.payload)});\n`);
}

function serializePayload(x: any): string {
  if (Map.isMap(x)) {
    return `fromJS(${serializePayload(x.toJS())})`;
  } else if (isArray(x)) {
    return `[ ${x.map(serializePayload).join(', ')} ]`;
  } else if (x && x.REC_TYPE) {
    return `fromJS(${JSON.stringify(x, null, 2)})`;
  } else {
    return JSON.stringify(x, null, 2);
  }
}

export function simplifyErrorMessage(err: Error): string {
  return (err.message || '')
    .replace(/\n[\s\S]*/, '') // remove everything after a newline
    .replace(/; context was:$/, ''); // remove standard assertion error trailer if present
}

export function expandErrorMessage(err: Error): string {
  return [
    err.stack,
    err['expected'] ? `Expected: ${inspect(err['expected'], false, 5, false)}` : null,
    err['actual'] ? `Actual:   ${inspect(err['actual'], false, 5, false)}` : null,
  ].filter(x => !!x).join('\n\n');
}
