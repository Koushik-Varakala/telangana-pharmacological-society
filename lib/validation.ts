export function text(value:FormDataEntryValue|null,max=200){return typeof value==='string'?value.trim().slice(0,max):''}
export function validEmail(value:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)}
export function validPhone(value:string){return /^[+\d][\d\s()-]{7,19}$/.test(value)}
