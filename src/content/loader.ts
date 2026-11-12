/** Встроенное дело включается в bundle и доступно без сети после установки. */
import data from '../../public/cases/case-001-blue-owl/case.json';
import { caseSchema } from './schema';
export const pilot = caseSchema.parse(data);
