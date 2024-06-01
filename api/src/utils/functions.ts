export function __delay__(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
