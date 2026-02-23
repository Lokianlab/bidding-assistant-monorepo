'use client';

/**
 * M07 usePartners Hook - 合作夥伴管理邏輯
 * 提供 CRUD 操作、搜尋、篩選功能
 */

import { useCallback, useEffect, useState } from 'react';
import { Partner, PartnerInput, PartnerSearchParams, PartnerResponse } from './types';
import { validatePartner, searchPartners as filterPartners } from './helpers';
import { logger } from '@/lib/logger';

interface UsePartnersState {
  partners: Partner[];
  loading: boolean;
  error: string | null;
}

export function usePartners() {
  const [state, setState] = useState<UsePartnersState>({
    partners: [],
    loading: false,
    error: null,
  });

  // 載入所有夥伴
  const loadPartners = useCallback(async (params?: PartnerSearchParams) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.append('search', params.search);
      if (params?.category) {
        const cats = Array.isArray(params.category) ? params.category : [params.category];
        queryParams.append('category', cats.join(','));
      }
      if (params?.status) queryParams.append('status', params.status);
      if (params?.sort) queryParams.append('sort', params.sort);
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response = await fetch(`/api/partners?${queryParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data: PartnerResponse = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }

      const partners = Array.isArray(data.data) ? data.data : [];
      setState({ partners, loading: false, error: null });
      logger.info('api', 'Loaded partners', `count: ${partners.length}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load partners';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      logger.error('api', 'Failed to load partners', message);
    }
  }, []);

  // 搜尋夥伴（本地快速篩選）
  const search = useCallback((keyword: string) => {
    setState((prev) => ({
      ...prev,
      partners: filterPartners(prev.partners, { search: keyword }),
    }));
  }, []);

  // 新增夥伴
  const add = useCallback(async (input: PartnerInput) => {
    const validation = validatePartner(input);
    if (!validation.valid) {
      const error = validation.errors.join(', ');
      setState((prev) => ({ ...prev, error }));
      return null;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data: PartnerResponse = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to add partner');
      }

      const newPartner = data.data as Partner;
      setState((prev) => ({
        ...prev,
        partners: [...prev.partners, newPartner],
        loading: false,
      }));
      logger.info('api', 'Partner added', `id: ${newPartner.id}`);
      return newPartner;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add partner';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      logger.error('api', 'Failed to add partner', message);
      return null;
    }
  }, []);

  // 編輯夥伴
  const update = useCallback(async (id: string, input: Partial<PartnerInput>) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(`/api/partners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data: PartnerResponse = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update partner');
      }

      const updated = data.data as Partner;
      setState((prev) => ({
        ...prev,
        partners: prev.partners.map((p) => (p.id === id ? updated : p)),
        loading: false,
      }));
      logger.info('api', 'Partner updated', `id: ${id}`);
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update partner';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      logger.error('api', 'Failed to update partner', message);
      return null;
    }
  }, []);

  // 刪除夥伴
  const deletePartner = useCallback(async (id: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(`/api/partners/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      setState((prev) => ({
        ...prev,
        partners: prev.partners.filter((p) => p.id !== id),
        loading: false,
      }));
      logger.info('api', 'Partner deleted', `id: ${id}`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete partner';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      logger.error('api', 'Failed to delete partner', message);
      return false;
    }
  }, []);

  // 標記已洽詢
  const markUsed = useCallback(async (id: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(`/api/partners/${id}/usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data: PartnerResponse = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to mark usage');
      }

      const updated = data.data as Partner;
      setState((prev) => ({
        ...prev,
        partners: prev.partners.map((p) => (p.id === id ? updated : p)),
        loading: false,
      }));
      logger.info('api', 'Partner marked used', `id: ${id}`);
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark usage';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      logger.error('api', 'Failed to mark usage', message);
      return null;
    }
  }, []);

  // 初次載入
  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  return {
    partners: state.partners,
    loading: state.loading,
    error: state.error,
    loadPartners,
    search,
    add,
    update,
    delete: deletePartner,
    markUsed,
  };
}

