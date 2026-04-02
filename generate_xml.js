import fs from 'fs';

const horses = [
  { color: 'brown', desc: 'striking, elegant desert bronze', coat: 'gleaming' },
  { color: 'black', desc: 'striking, elegant midnight black', coat: 'sleek' },
  { color: 'white', desc: 'pure pearl white', coat: 'bright' }
];

const items = {
  gold: 'a royal gold bridle and talli harness',
  silver: 'a desert silver bridle and talli harness',
  dark: 'a dark roast leather riding saddle',
  tan: 'a desert tan leather riding saddle',
  natural: 'natural palm leaf weaving adornments',
  dyed: 'dyed patterned palm leaf weaving adornments',
  red: 'a heritage red sadu woven blanket',
  black: 'a desert night black sadu woven blanket',
  terra: 'terracotta pottery flasks',
  blue: 'royal blue luxury silk fabrics'
};

const paths = [
  // S1
  ['gold'], ['silver'],
  // S2
  ['gold', 'dark'], ['gold', 'tan'], ['silver', 'dark'], ['silver', 'tan'],
  // S3
  ['gold', 'dark', 'natural'], ['gold', 'tan', 'natural'], ['silver', 'dark', 'natural'], ['silver', 'tan', 'natural'],
  ['gold', 'dark', 'dyed'], ['gold', 'tan', 'dyed'], ['silver', 'dark', 'dyed'], ['silver', 'tan', 'dyed'],
  // We will restrict to a few representative combinations to fit under ~100 images
];

// Let's generate a full combinatoric list up to S2 (4), S3 (8), S4 (16), S5 (16), S6 (16)
// S1: 2
// S2: 4
// S3: 8
// S4: 16
// S5: 16
// S6: 16
// Total = 62 * 3 = 186.
