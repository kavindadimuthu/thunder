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

import type {JSX} from 'react';
import {Typography, Button} from '@wso2/oxygen-ui';
import {useTranslation} from 'react-i18next';
import SettingsCard from '@/components/SettingsCard';

/**
 * Props for the {@link DangerZoneSection} component.
 */
interface DangerZoneSectionProps {
  /**
   * Callback function to open the revoke application confirmation dialog
   */
  onRevokeClick: () => void;
}

/**
 * Section component displaying the danger zone with destructive actions.
 *
 * Displays a revoke button for regenerating the application's client secret.
 * This action will invalidate the current client secret and all existing tokens.
 *
 * @param props - Component props
 * @returns Danger zone UI within a SettingsCard
 */
export default function DangerZoneSection({onRevokeClick}: DangerZoneSectionProps): JSX.Element {
  const {t} = useTranslation();

  return (
    <SettingsCard
      title={t('applications:edit.general.sections.dangerZone.title')}
      description={t('applications:edit.general.sections.dangerZone.description')}
    >
      <Typography variant="h6" gutterBottom color="error">
        {t('applications:edit.general.sections.dangerZone.revokeApp.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{mb: 3}}>
        {t('applications:edit.general.sections.dangerZone.revokeApp.description')}
      </Typography>
      <Button variant="contained" color="error" onClick={onRevokeClick}>
        {t('applications:edit.general.sections.dangerZone.revokeApp.button')}
      </Button>
    </SettingsCard>
  );
}
