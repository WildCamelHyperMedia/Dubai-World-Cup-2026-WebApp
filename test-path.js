const STATION_ORDER = ['talli', 'leather', 'alkhous', 'weaving', 'pottery', 'fabric'];

const getPath = (baseHorse, customizations, previewStationId, previewOptionId) => {
  const path = [];
  const horseColor = baseHorse === 'brown' ? 'brown' : baseHorse;
  
  for (const station of STATION_ORDER) {
    if (previewStationId === station && previewOptionId) {
      path.push(previewOptionId);
    } else if (customizations[station]) {
      path.push(customizations[station]);
    } else {
      break;
    }
  }

  if (path.length === 0) {
    return `/images/horses/${horseColor}.png`;
  }

  return `/images/comb/${horseColor}-${path.join('-')}.png`;
};

console.log(getPath('brown', {}, 'talli', 'gold'));
console.log(getPath('black', {}, 'talli', null));
