import { useMutation } from '@tanstack/react-query';

import { AuthScopes } from '@wcp/wario-shared-private';
import type {
  EncryptStringLock,
  IMoney,
  IssueStoreCreditRequest,
  SpendCreditResponse,
  ValidateLockAndSpendRequest,
} from '@wcp/wario-shared/types';

import axiosInstance from '@/utils/axios';

import { useGetAuthToken } from './useGetAuthToken';

// ============================================================================
// Types
// ============================================================================

export interface RedeemStoreCreditRequest {
  code: string;
  amount: IMoney;
  lock: EncryptStringLock;
  updatedBy: string;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Mutation hook for redeeming (spending) store credit.
 *
 * This mutation is POS-specific as it requires a lock from a prior validation
 * step and processes in-person store credit redemptions.
 *
 * @example
 * ```tsx
 * const redeemCredit = useRedeemStoreCreditMutation();
 *
 * const handleRedeem = () => {
 *   redeemCredit.mutate({
 *     code: creditCode,
 *     amount: debitAmount,
 *     lock: validationResponse.lock,
 *     updatedBy: processedBy,
 *   }, {
 *     onSuccess: (data) => {
 *       if (data.success) {
 *         // Handle successful redemption
 *       }
 *     }
 *   });
 * };
 * ```
 */
export function useRedeemStoreCreditMutation() {
  return useMutation<SpendCreditResponse, Error, RedeemStoreCreditRequest>({
    mutationKey: ['storeCredit', 'redeem'],
    mutationFn: async ({ code, amount, lock, updatedBy }: RedeemStoreCreditRequest) => {
      const body: ValidateLockAndSpendRequest = {
        code,
        amount,
        lock,
        updatedBy,
      };

      const response = await axiosInstance.post<SpendCreditResponse>('/api/v1/payments/storecredit/spend', body);

      return response.data;
    },
  });
}

/**
 * Mutation hook for issuing store credit.
 */
export function useIssueStoreCreditMutation() {
  const { getToken } = useGetAuthToken();

  return useMutation({
    mutationKey: ['storeCredit', 'issue'],
    mutationFn: async (body: IssueStoreCreditRequest) => {
      const token = await getToken(AuthScopes.EDIT_STORE_CREDIT);

      const response = await axiosInstance.post<unknown>('/api/v1/payments/storecredit/issue', body, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    },
  });
}
