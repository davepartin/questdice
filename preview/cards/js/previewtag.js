// A preview copy (any page under /preview/, js/lab.js) says so on screen, with its build, so a tester knows which copy they are in.
import { PREVIEW, LAB } from './lab.js';
const BUILD = (() => { try { return new URL(import.meta.url).searchParams.get('v') || 'dev'; } catch { return 'dev'; } })();
if (PREVIEW && !LAB && typeof document !== 'undefined' && !document.querySelector('.lab-tag')) {
  const tag = document.createElement('div'); tag.className = 'lab-tag'; tag.textContent = `PREVIEW · cards · build ${BUILD}`; document.body.append(tag);
}
