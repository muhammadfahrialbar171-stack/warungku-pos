import { supabase } from "./supabase";

/**
 * Logs a system activity for audit purposes
 * @param {string} action - Action name (e.g., 'EDIT_PRODUCT')
 * @param {object} details - Metadata about the action
 * @param {string} userId - ID of the user performing the action
 * @param {string} targetResource - Optional resource identifier (e.g., product SKU)
 */
export const logActivity = async (action, details, userId, targetResource = null) => {
    try {
        if (!userId) return;

        const { error } = await supabase
            .from('system_activities')
            .insert([{
                user_id: userId,
                action,
                details,
                target_resource: targetResource
            }]);

        if (error) {
            // Silently fail if table doesn't exist yet to avoid UX disruption
            if (error.code === '42P01') {
                console.warn('Audit table "system_activities" missing. Please run the SQL migration.');
            } else {
                console.error('Audit Log Error:', error);
            }
        }
    } catch (err) {
        console.error('Failed to log activity:', err);
    }
};
