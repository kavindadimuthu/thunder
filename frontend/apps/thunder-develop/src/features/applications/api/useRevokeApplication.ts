/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {useMutation, useQueryClient, type UseMutationResult} from '@tanstack/react-query';
import {useConfig} from '@thunder/shared-contexts';
import {useAsgardeo} from '@asgardeo/react';
import type {Application} from '../models/application';
import type {CreateApplicationRequest} from '../models/requests';
import type {InboundAuthConfig} from '../models/inbound-auth';
import ApplicationQueryKeys from '../constants/application-query-keys';

/**
 * Variables for the {@link useRevokeApplication} mutation.
 *
 * @public
 */
export interface RevokeApplicationVariables {
  /**
   * The unique identifier of the application to revoke
   */
  applicationId: string;
}

/**
 * Result of the {@link useRevokeApplication} mutation.
 *
 * @public
 */
export interface RevokeApplicationResult {
  /**
   * The updated application after revocation
   */
  application: Application;
  /**
   * The new client secret generated during revocation
   * This is only available immediately after revocation and should be saved by the user
   */
  clientSecret: string;
}

/**
 * Generates a random client secret for demonstration purposes.
 * This is a temporary implementation until a proper secure random string
 * generation utility is implemented.
 *
 * @remarks
 * In production, this should be replaced with a cryptographically secure
 * random string generator.
 *
 * @returns A 32-character random alphanumeric string
 */
function generateClientSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Converts an Application object to a CreateApplicationRequest by removing
 * server-generated fields.
 *
 * @param application - The full application object
 * @returns The application data suitable for update requests
 */
function toUpdateRequest(application: Application): CreateApplicationRequest {
  // Destructure to remove server-generated fields
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {id, created_at, updated_at, ...rest} = application;
  return rest as CreateApplicationRequest;
}

/**
 * Custom React hook to revoke an application's client secret.
 *
 * This hook handles the application revocation process by:
 * 1. Fetching the current application details
 * 2. Generating a new client secret
 * 3. Updating the application with the new client secret via the update API
 *
 * Upon successful revocation, the cache is invalidated to ensure the UI
 * reflects the latest changes.
 *
 * @remarks
 * Currently, there is no dedicated API endpoint to revoke an application.
 * This hook uses the update application endpoint to regenerate the client secret.
 * When a dedicated revoke endpoint is implemented in the backend, this hook
 * can be updated to use that endpoint without changing the UI components.
 *
 * @returns TanStack Query mutation object for revoking applications with mutate function, loading state, and error information
 *
 * @example
 * ```tsx
 * function RevokeButton({ applicationId }: { applicationId: string }) {
 *   const revokeApp = useRevokeApplication();
 *
 *   const handleRevoke = () => {
 *     revokeApp.mutate(
 *       { applicationId },
 *       {
 *         onSuccess: ({ application, clientSecret }) => {
 *           console.log('Application revoked:', application.id);
 *           console.log('New client secret:', clientSecret);
 *           // Display the new client secret to the user
 *         },
 *         onError: (error) => {
 *           console.error('Failed to revoke application:', error);
 *         }
 *       }
 *     );
 *   };
 *
 *   return (
 *     <button onClick={handleRevoke} disabled={revokeApp.isPending}>
 *       {revokeApp.isPending ? 'Revoking...' : 'Revoke Application'}
 *     </button>
 *   );
 * }
 * ```
 *
 * @public
 */
export default function useRevokeApplication(): UseMutationResult<
  RevokeApplicationResult,
  Error,
  RevokeApplicationVariables
> {
  const {http} = useAsgardeo();
  const {getServerUrl} = useConfig();
  const queryClient = useQueryClient();

  return useMutation<RevokeApplicationResult, Error, RevokeApplicationVariables>({
    mutationFn: async ({applicationId}: RevokeApplicationVariables): Promise<RevokeApplicationResult> => {
      const serverUrl: string = getServerUrl();

      // Step 1: Fetch the current application details
      const getResponse: {data: Application} = await http.request({
        url: `${serverUrl}/applications/${applicationId}`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      } as unknown as Parameters<typeof http.request>[0]);

      const currentApplication = getResponse.data;

      // Step 2: Generate a new client secret
      const newClientSecret = generateClientSecret();

      // Step 3: Prepare the update request with the new client secret
      const updateRequest = toUpdateRequest(currentApplication);

      // Update the OAuth2 config with the new client secret
      const inboundAuthConfig = updateRequest.inbound_auth_config as InboundAuthConfig[] | undefined;
      if (Array.isArray(inboundAuthConfig) && inboundAuthConfig.length > 0) {
        const oauth2Config = inboundAuthConfig.find((config: InboundAuthConfig) => config.type === 'oauth2');
        if (oauth2Config) {
          oauth2Config.config.client_secret = newClientSecret;
        }
      }

      // Step 4: Update the application with the new client secret
      const updateResponse: {data: Application} = await http.request({
        url: `${serverUrl}/applications/${applicationId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        data: JSON.stringify(updateRequest),
      } as unknown as Parameters<typeof http.request>[0]);

      return {
        application: updateResponse.data,
        clientSecret: newClientSecret,
      };
    },
    onSuccess: (_data, variables) => {
      // Invalidate and refetch the specific application
      queryClient
        .invalidateQueries({queryKey: [ApplicationQueryKeys.APPLICATION, variables.applicationId]})
        .catch(() => {
          // Ignore invalidation errors
        });
      // Invalidate and refetch applications list
      queryClient.invalidateQueries({queryKey: [ApplicationQueryKeys.APPLICATIONS]}).catch(() => {
        // Ignore invalidation errors
      });
    },
  });
}
