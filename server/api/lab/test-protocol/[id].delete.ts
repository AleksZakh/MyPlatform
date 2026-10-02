import { defineEventHandler } from 'h3';
import { deleteLabRecord } from '~~/server/services/lab/registry-delete.service';

export default defineEventHandler(event => deleteLabRecord(event, 'protocol'));
