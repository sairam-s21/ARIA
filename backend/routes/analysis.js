const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');

router.post('/analyze', analysisController.analyzeTransaction);
router.post('/generate-scenario', analysisController.generateScenario);
router.get('/transactions', analysisController.getTransactionLog);
router.get('/agents', analysisController.getAgents);
router.get('/policies', analysisController.getPolicies);
router.get('/overview', analysisController.getOverview);

module.exports = router;
