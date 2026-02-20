/**
 * Copyright (c) 2025-2026, WSO2 LLC. (https://www.wso2.com).
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

import {render, screen, waitFor} from '@thunder/test-utils';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import userEvent from '@testing-library/user-event';
import ApplicationRevokeDialog from '../ApplicationRevokeDialog';
import type {ApplicationRevokeDialogProps} from '../ApplicationRevokeDialog';

// Mock the logger
vi.mock('@thunder/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@thunder/logger')>();
  return {
    ...actual,
    useLogger: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  };
});

// Create a mock mutate function
const mockMutate = vi.fn();
const mockRevokeApplication = {
  mutate: mockMutate,
  isPending: false,
};

// Mock useRevokeApplication hook
vi.mock('../../api/useRevokeApplication', () => ({
  default: () => mockRevokeApplication,
}));

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'applications:revoke.dialog.title': 'Revoke Application',
        'applications:revoke.dialog.message':
          'Are you sure you want to revoke this application? This will regenerate the client secret.',
        'applications:revoke.dialog.disclaimer':
          'This action will invalidate the current client secret. All existing access tokens will be revoked and the application will stop working until the new client secret is updated in your application configuration.',
        'applications:revoke.dialog.confirmButton': 'Revoke',
        'applications:revoke.dialog.revoking': 'Revoking...',
        'applications:revoke.dialog.error': 'Failed to revoke application. Please try again.',
        'common:actions.cancel': 'Cancel',
      };
      return translations[key] || key;
    },
  }),
}));

describe('ApplicationRevokeDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();

  const defaultProps: ApplicationRevokeDialogProps = {
    open: true,
    applicationId: 'test-app-id',
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
    onError: mockOnError,
  };

  const renderDialog = (props: ApplicationRevokeDialogProps = defaultProps) =>
    render(<ApplicationRevokeDialog {...props} />);

  beforeEach(() => {
    vi.clearAllMocks();
    mockRevokeApplication.isPending = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the dialog when open is true', () => {
      renderDialog();

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Revoke Application')).toBeInTheDocument();
      expect(
        screen.getByText('Are you sure you want to revoke this application? This will regenerate the client secret.'),
      ).toBeInTheDocument();
    });

    it('should show warning disclaimer', () => {
      renderDialog();

      expect(
        screen.getByText(
          'This action will invalidate the current client secret. All existing access tokens will be revoked and the application will stop working until the new client secret is updated in your application configuration.',
        ),
      ).toBeInTheDocument();
    });

    it('should not render dialog content when open is false', () => {
      renderDialog({...defaultProps, open: false});

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render Cancel and Revoke buttons', () => {
      renderDialog();

      expect(screen.getByRole('button', {name: 'Cancel'})).toBeInTheDocument();
      expect(screen.getByRole('button', {name: 'Revoke'})).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderDialog();

      const cancelButton = screen.getByRole('button', {name: 'Cancel'});
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call mutate when Revoke button is clicked', async () => {
      const user = userEvent.setup();
      renderDialog();

      const revokeButton = screen.getByRole('button', {name: 'Revoke'});
      await user.click(revokeButton);

      expect(mockMutate).toHaveBeenCalledWith(
        {applicationId: 'test-app-id'},
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });

    it('should not initiate revocation when applicationId is null', async () => {
      const user = userEvent.setup();
      renderDialog({...defaultProps, applicationId: null});

      const revokeButton = screen.getByRole('button', {name: 'Revoke'});
      await user.click(revokeButton);

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe('Success Flow', () => {
    it('should call onSuccess with new client secret after successful revocation', async () => {
      // Mock mutate to immediately call onSuccess
      mockMutate.mockImplementation((_vars, options) => {
        options?.onSuccess?.({clientSecret: 'new-test-secret-123'});
      });

      const user = userEvent.setup();
      renderDialog();

      const revokeButton = screen.getByRole('button', {name: 'Revoke'});
      await user.click(revokeButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
        expect(mockOnSuccess).toHaveBeenCalledWith('new-test-secret-123');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when revocation fails', async () => {
      // Mock mutate to immediately call onError
      mockMutate.mockImplementation((_vars, options) => {
        options?.onError?.(new Error('Failed to revoke application. Please try again.'));
      });

      const user = userEvent.setup();
      renderDialog();

      const revokeButton = screen.getByRole('button', {name: 'Revoke'});
      await user.click(revokeButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to revoke application. Please try again.')).toBeInTheDocument();
      });
    });

    it('should call onError callback when revocation fails', async () => {
      // Mock mutate to immediately call onError
      mockMutate.mockImplementation((_vars, options) => {
        options?.onError?.(new Error('Failed to revoke application. Please try again.'));
      });

      const user = userEvent.setup();
      renderDialog();

      const revokeButton = screen.getByRole('button', {name: 'Revoke'});
      await user.click(revokeButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Failed to revoke application. Please try again.');
      });
    });
  });
});
