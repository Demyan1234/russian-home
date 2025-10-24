import { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/ContextProvider';
import { managerAPI } from '../http/managerAPI';
import { adminAPI } from '../http/adminAPI';

export const useReviewStats = () => {
  const { user } = useContext(AppContext);
  const [stats, setStats] = useState({
    total_reviews: 0,
    pending_reviews: 0,
    approved_reviews: 0,
    rejected_reviews: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      
      let response;
      if (user.user?.role === 'admin') {
        response = await adminAPI.getModerationStats();
      } else {
        response = await managerAPI.getModerationStats();
      }
      
      setStats(response.data || {
        total_reviews: 0,
        pending_reviews: 0,
        approved_reviews: 0,
        rejected_reviews: 0
      });
    } catch (error) {
      console.error('Error loading review stats:', error);
      setError('Не удалось загрузить статистику отзывов');
      setStats({
        total_reviews: 0,
        pending_reviews: 0,
        approved_reviews: 0,
        rejected_reviews: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatsAfterAction = (actionType) => {
    setStats(prev => {
      const newStats = { ...prev };
      
      switch (actionType) {
        case 'approve':
          newStats.pending_reviews = Math.max(0, prev.pending_reviews - 1);
          newStats.approved_reviews = prev.approved_reviews + 1;
          break;
        case 'reject':
          newStats.pending_reviews = Math.max(0, prev.pending_reviews - 1);
          newStats.rejected_reviews = prev.rejected_reviews + 1;
          break;
        case 'new_review':
          newStats.total_reviews = prev.total_reviews + 1;
          newStats.pending_reviews = prev.pending_reviews + 1;
          break;
        default:
          break;
      }
      
      return newStats;
    });
  };

  useEffect(() => {
    if (user.user?.role) {
      loadStats();
    }
  }, [user.user?.role]);

  return {
    stats,
    loading,
    error,
    refreshStats: loadStats,
    updateStatsAfterAction
  };
};