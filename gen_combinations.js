const fs = require('fs');

const horses = [
  { color: 'brown', desc: 'striking, elegant desert bronze', coat: 'gleaming' },
  { color: 'black', desc: 'striking, elegant black', coat: 'sleek' },
  { color: 'white', desc: 'pure white', coat: 'bright' }
];

const paths = [
  // S1
  { path: ['gold'], text: ['a royal gold bridle and talli harness'] },
  { path: ['silver'], text: ['a desert silver bridle and talli harness'] },
  // S2
  { path: ['gold', 'dark'], text: ['a royal gold bridle', 'a dark roast leather riding saddle'] },
  { path: ['gold', 'tan'], text: ['a royal gold bridle', 'a desert tan leather riding saddle'] },
  { path: ['silver', 'dark'], text: ['a desert silver bridle', 'a dark roast leather riding saddle'] },
  { path: ['silver', 'tan'], text: ['a desert silver bridle', 'a desert tan leather riding saddle'] },
  // S3
  { path: ['gold', 'dark', 'natural'], text: ['a royal gold bridle', 'a dark roast leather saddle', 'natural palm leaf weaving adornments'] },
  { path: ['gold', 'tan', 'natural'], text: ['a royal gold bridle', 'a desert tan leather saddle', 'natural palm leaf weaving adornments'] },
  { path: ['silver', 'dark', 'natural'], text: ['a desert silver bridle', 'a dark roast leather saddle', 'natural palm leaf weaving adornments'] },
  { path: ['silver', 'tan', 'natural'], text: ['a desert silver bridle', 'a desert tan leather saddle', 'natural palm leaf weaving adornments'] },
  // S4
  { path: ['gold', 'dark', 'natural', 'red'], text: ['a royal gold bridle', 'a dark roast saddle', 'palm leaf weaving', 'a heritage red sadu woven blanket'] },
  { path: ['gold', 'tan', 'natural', 'red'], text: ['a royal gold bridle', 'a desert tan saddle', 'palm leaf weaving', 'a heritage red sadu woven blanket'] },
  { path: ['silver', 'dark', 'natural', 'red'], text: ['a desert silver bridle', 'a dark roast saddle', 'palm leaf weaving', 'a heritage red sadu woven blanket'] },
  { path: ['silver', 'tan', 'natural', 'red'], text: ['a desert silver bridle', 'a desert tan saddle', 'palm leaf weaving', 'a heritage red sadu woven blanket'] },
  // S5
  { path: ['gold', 'dark', 'natural', 'red', 'terra'], text: ['a royal gold bridle', 'a dark roast saddle', 'palm weaving', 'a red sadu blanket', 'terracotta pottery flasks'] },
  { path: ['gold', 'tan', 'natural', 'red', 'terra'], text: ['a royal gold bridle', 'a desert tan saddle', 'palm weaving', 'a red sadu blanket', 'terracotta pottery flasks'] },
  { path: ['silver', 'dark', 'natural', 'red', 'terra'], text: ['a desert silver bridle', 'a dark roast saddle', 'palm weaving', 'a red sadu blanket', 'terracotta pottery flasks'] },
  { path: ['silver', 'tan', 'natural', 'red', 'terra'], text: ['a desert silver bridle', 'a desert tan saddle', 'palm weaving', 'a red sadu blanket', 'terracotta pottery flasks'] },
  // S6
  { path: ['gold', 'dark', 'natural', 'red', 'terra', 'blue'], text: ['a royal gold bridle', 'a dark roast saddle', 'palm weaving', 'a red sadu blanket', 'terracotta flasks', 'royal blue luxury silk fabrics'] },
  { path: ['gold', 'tan', 'natural', 'red', 'terra', 'blue'], text: ['a royal gold bridle', 'a desert tan saddle', 'palm weaving', 'a red sadu blanket', 'terracotta flasks', 'royal blue luxury silk fabrics'] },
  { path: ['silver', 'dark', 'natural', 'red', 'terra', 'blue'], text: ['a desert silver bridle', 'a dark roast saddle', 'palm weaving', 'a red sadu blanket', 'terracotta flasks', 'royal blue luxury silk fabrics'] },
  { path: ['silver', 'tan', 'natural', 'red', 'terra', 'blue'], text: ['a desert silver bridle', 'a desert tan saddle', 'palm weaving', 'a red sadu blanket', 'terracotta flasks', 'royal blue luxury silk fabrics'] }
];

let images = [];

horses.forEach(h => {
  paths.forEach(p => {
    images.push({
      prompt: `Full body portrait of a ${h.desc} Arabian horse with a ${h.coat} coat on a dark studio background, wearing ${p.text.join(', ')}. Professional photography, luxury, hyperrealistic.`,
      output_path: `client/src/assets/images/comb-${h.color}-${p.path.join('-')}.png`,
      aspect_ratio: "1:1",
      one_line_summary: `${h.color} ${p.path.join('-')}`,
      remove_background: false,
      overwrite: true
    });
  });
});

const chunks = [];
for(let i=0; i<images.length; i+=10) {
  chunks.push(images.slice(i, i+10));
}

chunks.forEach((c, idx) => {
  fs.writeFileSync(`chunk_${idx}.json`, JSON.stringify(c, null, 2));
});

console.log(`Generated ${chunks.length} chunks.`);
