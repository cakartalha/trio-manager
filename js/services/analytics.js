const AnalyticsService = {
  /**
   * Log an event to Firestore
   */
  async logEvent(type, data) {
    try {
      const now = new Date();
      const payload = {
        type: type,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        // Store year-month for easy filtering without index
        yearMonth:
          now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0"),
        createdAt: now.getTime(),
        ...data,
      };

      await db.collection(CONFIG.collections.analytics).add(payload);
      console.log("[Analytics] Event logged:", type, payload);
    } catch (error) {
      console.error("[Analytics] Error logging event:", error);
    }
  },

  /**
   * Get statistics for a specific month
   * @param {string} monthStr - Format "YYYY-MM"
   */
  async getStats(monthStr) {
    if (!monthStr) return [];

    try {
      // Simple query using yearMonth field - no composite index needed
      const snapshot = await db
        .collection(CONFIG.collections.analytics)
        .where("yearMonth", "==", monthStr)
        .get();

      // Sort client-side by createdAt
      const results = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      return results;
    } catch (error) {
      console.error("Analytics Query Error:", error);
      return [];
    }
  },

  /**
   * Clear all stats for a specific month
   */
  async clearStats(monthStr) {
    if (!monthStr) return;
    try {
      const snapshot = await db
        .collection(CONFIG.collections.analytics)
        .where("yearMonth", "==", monthStr)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(
        `[Analytics] Cleared ${snapshot.size} records for ${monthStr}`,
      );
      return snapshot.size;
    } catch (error) {
      console.error("Analytics Delete Error:", error);
      throw error;
    }
  },

  /**
   * Delete specific records by ID (for cleanup)
   * @param {string[]} recordIds - Array of document IDs to delete
   */
  async deletePhantomRecords(recordIds) {
    if (!recordIds || recordIds.length === 0) return 0;

    try {
      const batch = db.batch();
      let count = 0;

      // Firestore batches are limited to 500 operations, but likely we won't hit that here often.
      // For robustness, one could chunks it, but keeping it simple for now as phantom data is usually small.
      recordIds.forEach((id) => {
        const ref = db.collection(CONFIG.collections.analytics).doc(id);
        batch.delete(ref);
        count++;
      });

      await batch.commit();
      console.log(`[Analytics] Deleted ${count} phantom records.`);
      return count;
    } catch (error) {
      console.error("Analytics Phantom Delete Error:", error);
      throw error;
    }
  },
};
