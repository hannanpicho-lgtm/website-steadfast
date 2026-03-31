import { projectId, publicAnonKey } from '@utils/supabase/info';
import { FUNCTION_SERVICE_NAME, FRONTEND_APP_VERSION, FRONTEND_CONTRACT_VERSION } from '@utils/environment/config';

export const RUNTIME_ENVIRONMENT = {
  projectRef: projectId,
  functionName: FUNCTION_SERVICE_NAME,
  frontendAppVersion: FRONTEND_APP_VERSION,
  frontendContractVersion: FRONTEND_CONTRACT_VERSION,
  publicAnonKey,
  apiBaseUrl: `https://${projectId}.supabase.co/functions/v1/${FUNCTION_SERVICE_NAME}`,
};

export function getRuntimeEnvironmentDebugSnapshot() {
  return {
    projectRef: RUNTIME_ENVIRONMENT.projectRef,
    functionName: RUNTIME_ENVIRONMENT.functionName,
    apiBaseUrl: RUNTIME_ENVIRONMENT.apiBaseUrl,
    frontendContractVersion: RUNTIME_ENVIRONMENT.frontendContractVersion,
    frontendAppVersion: RUNTIME_ENVIRONMENT.frontendAppVersion,
  };
}
