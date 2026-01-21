const CHARSET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = CHARSET.length;

export function encode(num: number): string {
  if (num === 0) return CHARSET[0];
  
  let s = '';
  while (num > 0) {
    s = CHARSET[num % BASE] + s;
    num = Math.floor(num / BASE);
  }
  return s;
}

export function decode(str: string): number {
  let num = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const index = CHARSET.indexOf(char);
    if (index === -1) throw new Error(`Invalid character: ${char}`);
    num = num * BASE + index;
  }
  return num;
}
