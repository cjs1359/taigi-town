/** Task card evaluation */

import {
  hasFacility,
  countZones,
  countRoads,
  maxZoneLevel,
  zoneNearFacility,
  facilityNearFacility,
} from './map.js';

export function evaluateCheck(cells, check) {
  switch (check.type) {
    case 'hasFacility':
      return hasFacility(cells, check.facility);
    case 'hasFacilities':
      return check.facilities.every((f) => hasFacility(cells, f));
    case 'nearFacility':
      return facilityNearFacility(cells, check.facility, check.near, check.radius ?? 3);
    case 'zoneCount':
      return countZones(cells, check.zone) >= check.min;
    case 'roadCount':
      return countRoads(cells) >= check.min;
    case 'zoneLevel':
      return maxZoneLevel(cells, check.zone) >= check.minLevel;
    case 'zoneNearFacility':
      return zoneNearFacility(cells, check.zone, check.near, check.radius ?? 2);
    default:
      return false;
  }
}

export function checkTask(cells, task) {
  return evaluateCheck(cells, task.check);
}

export const DIFFICULTIES = [
  { id: 'both', label: '漢字＋臺羅', showHanji: true, showTailo: true },
  { id: 'tailo', label: '只有臺羅', showHanji: false, showTailo: true },
  { id: 'hanji', label: '只有漢字', showHanji: true, showTailo: false },
];
