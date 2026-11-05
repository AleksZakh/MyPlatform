/** Stable full-hue contract palette: saturation 50%, lightness 50%. */
export function uptsContractColor(id: number): string {
 const h = ((id * 137.507764) % 360) / 60;
 const c = .5, x = c * (1 - Math.abs(h % 2 - 1)), m = .25;
 const rgb = h < 1 ? [c,x,0] : h < 2 ? [x,c,0] : h < 3 ? [0,c,x] : h < 4 ? [0,x,c] : h < 5 ? [x,0,c] : [c,0,x];
 return '#' + rgb.map(v => Math.round((v+m)*255).toString(16).padStart(2,'0')).join('');
}
