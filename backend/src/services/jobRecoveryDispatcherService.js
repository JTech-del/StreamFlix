"use strict";

import {
recoverDueJobs
} from "./jobRecoveryService.js";

import {
dispatchJob
} from "./jobDispatcher.js";

/**

* Recovers retrying jobs whose retry delay has elapsed
* and dispatches the recovered jobs to their registered
* RabbitMQ publishers.
*
* Recovery itself is atomic. If dispatch fails, the job
* remains queued so that a later dispatch cycle can retry it.
  */
  export async function recoverAndDispatchDueJobs({
  limit = 100,
  now = new Date(),
  publisher = null
  } = {}) {
  const recoveredJobs =
  await recoverDueJobs({
  limit,
  now
  });

  const results = [];

  for (const job of recoveredJobs) {
  try {
  const dispatchResult =
  await dispatchJob(
  job,
  {
  publisher
  }
  );

  
       results.push({
           jobId: job.jobId,
           type: job.type,
           status: "dispatched",
           dispatch: dispatchResult
       });
   } catch (error) {
       results.push({
           jobId: job.jobId,
           type: job.type,
           status: "dispatch-failed",
           error: {
               code:
                   error?.code ??
                   "JOB_DISPATCH_FAILED",

               message:
                   error?.message ??
                   String(error)
           }
       });
   }


  }

  return {
  recovered: recoveredJobs.length,


   dispatched:
       results.filter(
           (result) =>
               result.status ===
               "dispatched"
       ).length,

   failed:
       results.filter(
           (result) =>
               result.status ===
               "dispatch-failed"
       ).length,

   results


  };
  }
