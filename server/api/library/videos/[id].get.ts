import { readVideo, videoDto } from '../../../services/library-video/core';
export default defineEventHandler(async event => videoDto((await readVideo(event, getRouterParam(event, 'id') || '')).video));
