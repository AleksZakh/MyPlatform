import {contractAccess} from '../../../../services/diagnostic/access';
import {tripId,tripWorkCandidates} from '../../../../services/diagnostic/trips';
export default defineEventHandler(async event=>{await contractAccess(event,'VIEW');return tripWorkCandidates(tripId(getRouterParam(event,'id')));});
