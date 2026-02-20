/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
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

import {useState, type JSX} from 'react';
import {Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Alert} from '@wso2/oxygen-ui';
import {useTranslation} from 'react-i18next';
import {useLogger} from '@thunder/logger';

/**
 * Props for the {@link ApplicationRevokeDialog} component.
 */
export interface ApplicationRevokeDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;
  /**
   * The ID of the application to revoke
   */
  applicationId: string | null;
  /**
   * Callback when the dialog should be closed
   */
  onClose: () => void;
  /**
   * Callback when the application is successfully revoked with new client secret
   */
  onSuccess?: (newClientSecret: string) => void;
  /**
   * Callback when the revocation fails
   */
  onError?: (message: string) => void;
}

/**
 * Generates a mock client secret for demonstration purposes.
 * In production, this would be returned from the backend API.
 */
function generateMockClientSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Dialog component for confirming application revocation.
 *
 * This dialog warns users about the consequences of revoking an application's
 * client secret before proceeding with the action.
 *
 * @param props - Component props
 * @returns The revoke confirmation dialog
 */
export default function ApplicationRevokeDialog({
  open,
  applicationId,
  onClose,
  onSuccess = undefined,
  onError = undefined,
}: ApplicationRevokeDialogProps): JSX.Element {
  const {t} = useTranslation();
  const logger = useLogger('ApplicationRevokeDialog');
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = (): void => {
    setError(null);
    onClose();
  };

  const handleConfirm = async (): Promise<void> => {
    if (!applicationId) return;

    setIsRevoking(true);
    setError(null);

    try {
      // TODO: Replace with actual API call when backend is implemented
      // Mock API call with simulated delay
      logger.info('Revoking application client secret', {applicationId});

      await new Promise((resolve) => {
        setTimeout(resolve, 1500);
      });

      // Simulate success with 90% probability, failure with 10%
      const shouldSucceed = Math.random() > 0.1;

      if (shouldSucceed) {
        const newClientSecret = generateMockClientSecret();

        // Log the new client secret for demonstration purposes
        logger.info('Application revoked successfully. New client secret generated.', {
          applicationId,
          newClientSecret,
        });

        // eslint-disable-next-line no-console
        console.log('='.repeat(60));
        // eslint-disable-next-line no-console
        console.log('NEW CLIENT SECRET (for demonstration):');
        // eslint-disable-next-line no-console
        console.log(newClientSecret);
        // eslint-disable-next-line no-console
        console.log('='.repeat(60));

        setIsRevoking(false);
        onClose();
        onSuccess?.(newClientSecret);
      } else {
        // Simulate API error
        throw new Error('Failed to revoke application. Please try again.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('applications:revoke.dialog.error');
      logger.error('Failed to revoke application', {applicationId, error: err});
      setError(errorMessage);
      setIsRevoking(false);
      onError?.(errorMessage);
    }
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{t('applications:revoke.dialog.title')}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{mb: 2}}>{t('applications:revoke.dialog.message')}</DialogContentText>
        <Alert severity="warning" sx={{mb: 2}}>
          {t('applications:revoke.dialog.disclaimer')}
        </Alert>
        {error && (
          <Alert severity="error" sx={{mt: 2}}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} disabled={isRevoking}>
          {t('common:actions.cancel')}
        </Button>
        <Button
          onClick={() => {
            handleConfirm().catch(() => {
              // Error is already handled in handleConfirm
            });
          }}
          color="error"
          variant="contained"
          disabled={isRevoking}
        >
          {isRevoking ? t('applications:revoke.dialog.revoking') : t('applications:revoke.dialog.confirmButton')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
