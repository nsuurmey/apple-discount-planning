// @ts-nocheck
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

export default function ApplePurchasingSimulator() {
  
  const defaultFarmTypes = [
    { id: 1, name: 'Full price', sharePercent: 60, minDiscount: 0, maxDiscount: 0 },
    { id: 2, name: 'Small discount', sharePercent: 25, minDiscount: 5, maxDiscount: 10 },
    { id: 3, name: 'Medium discount', sharePercent: 10, minDiscount: 15, maxDiscount: 25 },
    { id: 4, name: 'Big discount', sharePercent: 5, minDiscount: 30, maxDiscount: 40 }
  ];

  const [scenarios, setScenarios] = useState([
    {
      id: 1,
      name: 'Base Case',
      lastYearCost: 1000000,
      lastYearFarms: 30,
      minNewFarms: 8,
      maxNewFarms: 15,
      trials: 10000,
      farmTypes: defaultFarmTypes,
      results: null
    }
  ]);

  const [activeScenarioId, setActiveScenarioId] = useState(1);
  const [errors, setErrors] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  const activeScenario = scenarios.find(s => s.id === activeScenarioId);

  // RNG functions
  const createRNG = (seed?: number) => {
    let state = seed || Math.floor(Math.random() * 1000000);
    return {
      random: () => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state / 0x7fffffff;
      },
      integers: (min: number, max: number) => {
        return Math.floor(min + (max - min + 1) * (state = (state * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      },
      uniform: (min: number, max: number) => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return min + (max - min) * (state / 0x7fffffff);
      },
      choice: (n: number, probs: number[]) => {
        const r = (state = (state * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
        let cumsum = 0;
        for (let i = 0; i < n; i++) {
          cumsum += probs[i];
          if (r < cumsum) return i;
        }
        return n - 1;
      }
    };
  };

  // Validation
  const validateScenario = (scenario) => {
    const newErrors = {};

    if (scenario.lastYearCost <= 0) {
      newErrors.lastYearCost = "Must be greater than 0";
    }
    if (scenario.lastYearFarms <= 0) {
      newErrors.lastYearFarms = "Must be greater than 0";
    }
    if (scenario.minNewFarms <= 0) {
      newErrors.minNewFarms = "Must be greater than 0";
    }
    if (scenario.maxNewFarms <= 0) {
      newErrors.maxNewFarms = "Must be greater than 0";
    }
    if (scenario.minNewFarms > scenario.maxNewFarms) {
      newErrors.minNewFarms = "Min farms cannot exceed max farms";
    }
    if (scenario.trials <= 0 || scenario.trials > 200000) {
      newErrors.trials = "Must be between 1 and 200,000";
    }

    // Validate farm types
    const totalShare = scenario.farmTypes.reduce((sum, ft) => sum + ft.sharePercent, 0);
    if (Math.abs(totalShare - 100) > 0.5) {
      newErrors.farmTypes = `Shares must sum to 100% (currently ${totalShare.toFixed(1)}%)`;
    }

    scenario.farmTypes.forEach((ft, idx) => {
      if (ft.sharePercent < 0 || ft.sharePercent > 100) {
        newErrors[`farmType_${idx}_share`] = "Must be 0-100";
      }
      if (ft.minDiscount < 0 || ft.minDiscount > 100) {
        newErrors[`farmType_${idx}_minDiscount`] = "Must be 0-100";
      }
      if (ft.maxDiscount < 0 || ft.maxDiscount > 100) {
        newErrors[`farmType_${idx}_maxDiscount`] = "Must be 0-100";
      }
      if (ft.minDiscount > ft.maxDiscount) {
        newErrors[`farmType_${idx}_discount`] = "Max must be ≥ min";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Farm type simulation
  const runFarmTypeSimulation = (scenario) => {
    const rng = createRNG(42);
    const avgPriceLastYear = scenario.lastYearCost / scenario.lastYearFarms;

    // Normalize shares to probabilities
    const shares = scenario.farmTypes.map(ft => ft.sharePercent);
    const total = shares.reduce((sum, s) => sum + s, 0);
    const probs = shares.map(s => s / total);

    // Precompute multiplier ranges
    const minMult = scenario.farmTypes.map(ft => 1.0 - ft.maxDiscount / 100);
    const maxMult = scenario.farmTypes.map(ft => 1.0 - ft.minDiscount / 100);

    const savings = [];

    for (let i = 0; i < scenario.trials; i++) {
      const nFarms = rng.integers(scenario.minNewFarms, scenario.maxNewFarms);
      let thisYearCostPartial = 0;

      for (let j = 0; j < nFarms; j++) {
        const typeIdx = rng.choice(scenario.farmTypes.length, probs);
        const multiplier = rng.uniform(minMult[typeIdx], maxMult[typeIdx]);
        thisYearCostPartial += multiplier * avgPriceLastYear;
      }

      const thisYearScaledCost = thisYearCostPartial * (scenario.lastYearFarms / nFarms);
      savings.push(scenario.lastYearCost - thisYearScaledCost);
    }

    // Calculate statistics
    const sortedSavings = [...savings].sort((a, b) => a - b);
    const mean = savings.reduce((a, b) => a + b, 0) / savings.length;
    const median = sortedSavings[Math.floor(sortedSavings.length / 2)];
    const variance = savings.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (savings.length - 1);
    const std = Math.sqrt(variance);
    const min = Math.min(...savings);
    const max = Math.max(...savings);
    const p10 = sortedSavings[Math.floor(sortedSavings.length * 0.1)];
    const p90 = sortedSavings[Math.floor(sortedSavings.length * 0.9)];
    const probPositive = savings.filter(s => s > 0).length / savings.length;

    return {
      stats: { mean, median, std, min, max, p10, p90, probPositive },
      savings
    };
  };

  // Create histogram
  const createHistogramData = (savings) => {
    const numBins = 40;
    const min = Math.min(...savings);
    const max = Math.max(...savings);
    const binWidth = (max - min) / numBins;

    const bins = Array(numBins).fill(0);
    savings.forEach(s => {
      const binIndex = Math.min(Math.floor((s - min) / binWidth), numBins - 1);
      bins[binIndex]++;
    });

    return Array(numBins).fill(0).map((_, i) => ({
      savings: Math.round(min + i * binWidth),
      count: bins[i]
    }));
  };

  // Run simulation
  const handleRunSimulation = () => {
    if (!validateScenario(activeScenario)) return;

    setIsRunning(true);
    setTimeout(() => {
      try {
        const result = runFarmTypeSimulation(activeScenario);
        const histogramData = createHistogramData(result.savings);
        
        setScenarios(scenarios.map(s => 
          s.id === activeScenarioId 
            ? { ...s, results: { ...result, histogramData } }
            : s
        ));
      } catch (error) {
        alert('Simulation error: ' + error.message);
      } finally {
        setIsRunning(false);
      }
    }, 100);
  };

  // Update scenario
  const updateScenario = (updates) => {
    setScenarios(scenarios.map(s => 
      s.id === activeScenarioId ? { ...s, ...updates } : s
    ));
  };

  // Update farm type
  const updateFarmType = (typeId, field, value) => {
    const updatedTypes = activeScenario.farmTypes.map(ft =>
      ft.id === typeId ? { ...ft, [field]: value } : ft
    );
    updateScenario({ farmTypes: updatedTypes });
  };

  // Add farm type
  const addFarmType = () => {
    const newId = Math.max(...activeScenario.farmTypes.map(ft => ft.id)) + 1;
    const newType = { id: newId, name: 'New type', sharePercent: 0, minDiscount: 0, maxDiscount: 0 };
    updateScenario({ farmTypes: [...activeScenario.farmTypes, newType] });
  };

  // Delete farm type
  const deleteFarmType = (typeId) => {
    if (activeScenario.farmTypes.length <= 1) {
      alert('Must have at least one farm type');
      return;
    }
    updateScenario({ farmTypes: activeScenario.farmTypes.filter(ft => ft.id !== typeId) });
  };

  // Duplicate scenario
  const duplicateScenario = () => {
    const newId = Math.max(...scenarios.map(s => s.id)) + 1;
    const newScenario = {
      ...activeScenario,
      id: newId,
      name: activeScenario.name + ' (copy)',
      results: null,
      farmTypes: activeScenario.farmTypes.map(ft => ({ ...ft }))
    };
    setScenarios([...scenarios, newScenario]);
    setActiveScenarioId(newId);
  };

  // Delete scenario
  const deleteScenario = (scenarioId) => {
    if (scenarios.length <= 1) {
      alert('Must have at least one scenario');
      return;
    }
    setScenarios(scenarios.filter(s => s.id !== scenarioId));
    if (activeScenarioId === scenarioId) {
      setActiveScenarioId(scenarios.find(s => s.id !== scenarioId).id);
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const totalShare = activeScenario.farmTypes.reduce((sum, ft) => sum + ft.sharePercent, 0);
  const shareWarning = Math.abs(totalShare - 100) > 0.5;

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-white">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">🍎 Discount Scenario Explorer</h1>
      <p className="text-gray-600 mb-6">
        Define farm types with discount ranges and compare scenarios using Monte Carlo simulation
      </p>

      {/* Scenario tabs */}
      <div className="flex items-center gap-2 mb-6 border-b">
        {scenarios.map(scenario => (
          <div key={scenario.id} className="relative">
            <button
              onClick={() => setActiveScenarioId(scenario.id)}
              className={`px-4 py-2 ${
                scenario.id === activeScenarioId
                  ? 'border-b-2 border-blue-600 font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {scenario.name}
            </button>
            {scenarios.length > 1 && (
              <button
                onClick={() => deleteScenario(scenario.id)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          onClick={duplicateScenario}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
        >
          + Duplicate
        </button>
        <button
          onClick={() => setCompareMode(!compareMode)}
          className={`ml-auto px-3 py-1 text-sm border rounded ${
            compareMode ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          {compareMode ? 'Exit Compare' : 'Compare Scenarios'}
        </button>
      </div>

      {compareMode ? (
        /* Comparison view */
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Scenario Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2 text-left">Metric</th>
                  {scenarios.map(s => (
                    <th key={s.id} className="border p-2">{s.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-2 font-medium">Median Savings</td>
                  {scenarios.map(s => (
                    <td key={s.id} className="border p-2 text-center">
                      {s.results ? formatCurrency(s.results.stats.median) : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border p-2 font-medium">P10-P90 Range</td>
                  {scenarios.map(s => (
                    <td key={s.id} className="border p-2 text-center text-sm">
                      {s.results ? `${formatCurrency(s.results.stats.p10)} to ${formatCurrency(s.results.stats.p90)}` : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border p-2 font-medium">Prob Savings {'>'} 0</td>
                  {scenarios.map(s => (
                    <td key={s.id} className="border p-2 text-center">
                      {s.results ? `${(s.results.stats.probPositive * 100).toFixed(1)}%` : '—'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Single scenario view */
        <div className="grid md:grid-cols-2 gap-6">
          {/* Input panel */}
          <div className="space-y-6">
            {/* Basic inputs */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Scenario Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Scenario Name</label>
                  <input
                    type="text"
                    value={activeScenario.name}
                    onChange={(e) => updateScenario({ name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Last Year Spend ($)</label>
                    <input
                      type="number"
                      value={activeScenario.lastYearCost}
                      onChange={(e) => updateScenario({ lastYearCost: parseFloat(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border rounded-md ${errors.lastYearCost ? 'border-red-500' : ''}`}
                    />
                    {errors.lastYearCost && <p className="text-red-500 text-xs mt-1">{errors.lastYearCost}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Last Year Farms</label>
                    <input
                      type="number"
                      value={activeScenario.lastYearFarms}
                      onChange={(e) => updateScenario({ lastYearFarms: parseInt(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border rounded-md ${errors.lastYearFarms ? 'border-red-500' : ''}`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min Farms This Year</label>
                    <input
                      type="number"
                      value={activeScenario.minNewFarms}
                      onChange={(e) => updateScenario({ minNewFarms: parseInt(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border rounded-md ${errors.minNewFarms ? 'border-red-500' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Farms This Year</label>
                    <input
                      type="number"
                      value={activeScenario.maxNewFarms}
                      onChange={(e) => updateScenario({ maxNewFarms: parseInt(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border rounded-md ${errors.maxNewFarms ? 'border-red-500' : ''}`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Simulation Trials</label>
                  <input
                    type="number"
                    value={activeScenario.trials}
                    onChange={(e) => updateScenario({ trials: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 border rounded-md ${errors.trials ? 'border-red-500' : ''}`}
                  />
                </div>
              </div>
            </div>

            {/* Farm types table */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Farm Types</h3>
                <button
                  onClick={addFarmType}
                  className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Add Type
                </button>
              </div>
              
              {shareWarning && (
                <div className="bg-yellow-50 border border-yellow-300 rounded p-2 mb-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Shares total {totalShare.toFixed(1)}% (should be 100%)
                  </p>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-2">Type</th>
                      <th className="text-center py-2 px-2">Share %</th>
                      <th className="text-center py-2 px-2">Min %</th>
                      <th className="text-center py-2 px-2">Max %</th>
                      <th className="py-2 pl-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeScenario.farmTypes.map((ft) => (
                      <tr key={ft.id} className="border-b">
                        <td className="py-2 pr-2">
                          <input
                            type="text"
                            value={ft.name}
                            onChange={(e) => updateFarmType(ft.id, 'name', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={ft.sharePercent}
                            onChange={(e) => updateFarmType(ft.id, 'sharePercent', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border rounded text-sm text-center"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={ft.minDiscount}
                            onChange={(e) => updateFarmType(ft.id, 'minDiscount', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border rounded text-sm text-center"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={ft.maxDiscount}
                            onChange={(e) => updateFarmType(ft.id, 'maxDiscount', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border rounded text-sm text-center"
                          />
                        </td>
                        <td className="py-2 pl-2">
                          <button
                            onClick={() => deleteFarmType(ft.id)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={isRunning || shareWarning}
                className="w-full mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isRunning ? 'Running...' : 'Run Simulation'}
              </button>
            </div>
          </div>

          {/* Results panel */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Results</h3>
              
              {!activeScenario.results ? (
                <div className="text-center py-12 text-gray-500">
                  Configure settings and click "Run Simulation"
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs text-gray-600">Median Savings (P50)</div>
                      <div className="text-xl font-bold text-green-600">
                        {formatCurrency(activeScenario.results.stats.median)}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs text-gray-600">Probability {'>'} 0</div>
                      <div className="text-xl font-bold">
                        {(activeScenario.results.stats.probPositive * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs text-gray-600">10th Percentile (P10)</div>
                      <div className="text-lg font-semibold">
                        {formatCurrency(activeScenario.results.stats.p10)}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs text-gray-600">90th Percentile (P90)</div>
                      <div className="text-lg font-semibold">
                        {formatCurrency(activeScenario.results.stats.p90)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                    <p className="font-semibold text-blue-900 mb-1">What does this mean?</p>
                    <p className="text-blue-800 mb-2">
                      Median savings: <strong>{formatCurrency(activeScenario.results.stats.median)}</strong> (in half the simulated scenarios you save more, in half you save less).
                    </p>
                    <p className="text-blue-800">
                      In 80% of simulations, savings were between <strong>{formatCurrency(activeScenario.results.stats.p10)}</strong> and <strong>{formatCurrency(activeScenario.results.stats.p90)}</strong>.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Histogram */}
            {activeScenario.results && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Savings Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activeScenario.results.histogramData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="savings" 
                      tickFormatter={(v) => formatCurrency(v)}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip formatter={(v, name) => [v, name === 'count' ? 'Count' : 'Savings']} />
                    <ReferenceLine x={Math.round(activeScenario.results.stats.p10)} stroke="#f59e0b" strokeDasharray="3 3" label="P10" />
                    <ReferenceLine x={Math.round(activeScenario.results.stats.median)} stroke="#059669" strokeDasharray="3 3" label="P50" />
                    <ReferenceLine x={Math.round(activeScenario.results.stats.p90)} stroke="#f59e0b" strokeDasharray="3 3" label="P90" />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}