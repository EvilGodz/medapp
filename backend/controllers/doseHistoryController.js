const DoseHistory = require('../models/DoseHistory');

const doseHistoryController = {
  async getAll(req, res) {
    try {
      const userId = req.user.id;
      console.log('[GET] /dose-history for user', userId);
      const doses = await DoseHistory.getAll(userId);
      res.json(doses);
    } catch (err) {
      console.error('[ERROR][GET] /dose-history:', err);
      res.status(500).json({ error: err.message });
    }
  },
  async getById(req, res) {
    try {
      const userId = req.user.id;
      console.log(`[GET] /dose-history/${req.params.id} for user`, userId);
      const dose = await DoseHistory.getById(req.params.id, userId);
      if (!dose) return res.status(404).json({ error: 'Not found' });
      res.json(dose);
    } catch (err) {
      console.error(`[ERROR][GET] /dose-history/${req.params.id}:`, err);
      res.status(500).json({ error: err.message });
    }
  },
  async create(req, res) {
    try {
      const userId = req.user.id;
      console.log('[POST] /dose-history', req.body, 'for user', userId);
      await DoseHistory.create(req.body, userId);
      res.status(201).json({ message: 'Created' });
    } catch (err) {
      console.error('[ERROR][POST] /dose-history:', err);
      res.status(500).json({ error: err.message });
    }
  },
  async update(req, res) {
    try {
      const userId = req.user.id;
      console.log(`[PUT] /dose-history/${req.params.id}`, req.body, 'for user', userId);
      await DoseHistory.update(req.params.id, req.body, userId);
      res.json({ message: 'Updated' });
    } catch (err) {
      console.error(`[ERROR][PUT] /dose-history/${req.params.id}:`, err);
      res.status(500).json({ error: err.message });
    }
  },
  async delete(req, res) {
    try {
      const userId = req.user.id;
      console.log(`[DELETE] /dose-history/${req.params.id} for user`, userId);
      await DoseHistory.delete(req.params.id, userId);
      res.json({ message: 'Deleted' });
    } catch (err) {
      console.error(`[ERROR][DELETE] /dose-history/${req.params.id}:`, err);
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = doseHistoryController; 