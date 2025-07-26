import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Temporarily disabled due to build issues
// import Tesseract from 'tesseract.js';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convertToAscii(inputString: string) {
  // remove non ascii characters
  const asciiString = inputString.replace(/[^\x00-\x7F]+/g, "");
  return asciiString;
}

/**
 * Esegue OCR su un buffer immagine (PNG/JPG) e restituisce il testo estratto
 * @param {Buffer} imageBuffer
 * @param {string} lang Codice lingua tesseract (es: 'ita+eng')
 * @returns {Promise<string>} testo estratto
 */
export async function ocrImageBuffer(imageBuffer: Buffer, lang: string = 'ita+eng'): Promise<string> {
  // Temporarily disabled due to build issues
  console.log("OCR temporarily disabled");
  return "";
  
  // const { data } = await Tesseract.recognize(imageBuffer, lang, {
  //   logger: m => console.log(m),
  // });
  // return data.text;
}
