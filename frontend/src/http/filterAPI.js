import { authRequest } from './api';

export const filterAPI = {
    getFilterStats: () => {
        return authRequest.get('/api/admin/filters/stats');
    },

    cleanupMaterials: (materials) => {
        return authRequest.post('/api/admin/filters/materials/cleanup', { materialsToRemove: materials });
    },

    cleanupColors: (colors) => {
        return authRequest.post('/api/admin/filters/colors/cleanup', { colorsToRemove: colors });
    },

    deleteMaterial: (material) => {
        return authRequest.delete(`/api/admin/filters/materials/${material}`);
    },

    deleteColor: (color) => {
        return authRequest.delete(`/api/admin/filters/colors/${color}`);
    }
};

