## 1. Purpose of this supplement

Extend the existing “Apple Purchasing Cost Simulator” so that farm price multipliers are drawn from a **mixture distribution** that reflects two regimes: (1) farms at or near last year’s price and (2) farms offering discounts. The goal is to better match the real-world belief that most farms will be near full price, with a dwindling number at higher discounts. [informs-sim](https://www.informs-sim.org/wsc08papers/012.pdf)

***

## 2. New concept: mixture model for farm prices

### 2.1 Intuition

- Each farm belongs (conceptually) to one of two groups:  
  - Group A: “Regular-price” farms (price multiplier ≈ 1.0).  
  - Group B: “Discount” farms (price multiplier < 1.0).  
- For each farm in each simulation trial, we first decide which group it is in, then sample a price multiplier from that group’s distribution. [gordanz.github](https://gordanz.github.io/stochastic-book/simulation-of-random-variables-and-monte-carlo.html)

### 2.2 Parameters to add

Add the following inputs to the existing widget (with reasonable defaults):

- `p_full_price` (float in, default 0.8) [sciencedirect](https://www.sciencedirect.com/science/article/pii/S0308521X25000381)
  - Interpretation: probability a randomly selected farm is in Group A (full/near-full price).  
- Group A parameters:  
  - `full_price_mode`: choice of either `"fixed"` or `"normal_truncated"`.  
  - If `"fixed"` (default):  
    - `full_price_multiplier` (default 1.0).  
  - If `"normal_truncated"` (optional advanced):  
    - `full_price_mean` (default 1.0).  
    - `full_price_std` (default 0.02).  
    - Truncate to [0.8, 1.2] or another chosen interval.
- Group B parameters (discount group):  
  - Distribution type selector: `"uniform"` or `"beta"` on [min_discount, 1.0].  
  - `min_discount_multiplier` (default 0.2).  
  - If `"uniform"`: sample from Uniform[min_discount_multiplier, 1.0).  
  - If `"beta"`:  
    - `discount_beta_alpha` (default 2.0).  
    - `discount_beta_beta` (default 5.0).  
    - Map Beta(α,β) from  to [min_discount_multiplier, 1.0). [sciencedirect](https://www.sciencedirect.com/science/article/pii/S0308521X25000381)

These are **advanced** inputs; keep the default behavior close to the existing uniform model so novice users are not overwhelmed.

***

## 3. Functional changes

### 3.1 New sampling function

Introduce a new function to replace or augment the current “draw multipliers uniformly” logic:

```python
import numpy as np
from numpy.typing import ArrayLike

def sample_price_multipliers_mixture(
    rng: np.random.Generator,
    n_farms: int,
    p_full_price: float = 0.8,
    full_price_mode: str = "fixed",
    full_price_multiplier: float = 1.0,
    full_price_mean: float = 1.0,
    full_price_std: float = 0.02,
    min_discount_multiplier: float = 0.2,
    discount_dist: str = "uniform",  # "uniform" or "beta"
    discount_beta_alpha: float = 2.0,
    discount_beta_beta: float = 5.0,
) -> np.ndarray:
    """
    Return an array of length n_farms with price multipliers for each farm
    using a two-component mixture model.
    """
    # 1) Assign each farm to Group A (full price) or Group B (discount)
    is_full = rng.random(n_farms) < p_full_price

    multipliers = np.empty(n_farms, dtype=float)

    # 2) Group A: full/near-full price
    if full_price_mode == "fixed":
        multipliers[is_full] = full_price_multiplier
    elif full_price_mode == "normal_truncated":
        # Draw from normal and truncate to [0, 2] as a simple bound
        vals = rng.normal(full_price_mean, full_price_std, size=is_full.sum())
        vals = np.clip(vals, 0.0, 2.0)
        multipliers[is_full] = vals
    else:
        raise ValueError(f"Unknown full_price_mode: {full_price_mode}")

    # 3) Group B: discount farms
    n_discount = (~is_full).sum()
    if n_discount > 0:
        if discount_dist == "uniform":
            vals = rng.uniform(min_discount_multiplier, 1.0, size=n_discount)
        elif discount_dist == "beta":
            # Beta on [0,1], then linearly map to [min_discount_multiplier, 1.0]
            raw = rng.beta(discount_beta_alpha, discount_beta_beta, size=n_discount)
            vals = min_discount_multiplier + raw * (1.0 - min_discount_multiplier)
        else:
            raise ValueError(f"Unknown discount_dist: {discount_dist}")
        multipliers[~is_full] = vals

    return multipliers
```

### 3.2 Integrate into existing Monte Carlo

Modify the inner loop of `run_monte_carlo` to call the mixture sampler instead of `rng.uniform(min_price_multiplier, max_price_multiplier, size=n_farms)`:

- Existing core (pseudo):

```python
multipliers = rng.uniform(min_price_multiplier, max_price_multiplier, size=n_farms)
```

- New core:

```python
multipliers = sample_price_multipliers_mixture(
    rng=rng,
    n_farms=n_farms,
    p_full_price=p_full_price,
    full_price_mode=full_price_mode,
    full_price_multiplier=full_price_multiplier,
    full_price_mean=full_price_mean,
    full_price_std=full_price_std,
    min_discount_multiplier=min_discount_multiplier,
    discount_dist=discount_dist,
    discount_beta_alpha=discount_beta_alpha,
    discount_beta_beta=discount_beta_beta,
)
```

The rest of the cost and savings calculation remains unchanged.

***

## 4. UI/UX updates

### 4.1 New “Price model” section

Add a collapsible “Price model (advanced)” section to the existing widget:

- Dropdown: **Price model**  
  - Option A (default): “Simple uniform discount range” (current behavior).  
  - Option B: “Mixture: full-price + discount farms”.

- If Option A selected: keep current inputs as-is (min/max price multiplier).  
- If Option B selected: show:

  - Slider/input for **Share of full-price farms** (`p_full_price`, 0–1).  
  - Toggle for **Full-price behavior**:  
    - “Exactly last year’s price (1.0)” (fixed mode).  
    - “Allow small variation around 1.0” (normal_truncated; show mean/std fields).  
  - Discount group configuration:  
    - `min_discount_multiplier` (slider or numeric).  
    - Distribution type: radio buttons “Uniform” (default) or “Beta”.  
    - If “Beta”: show α and β inputs with helper text about shape.

### 4.2 Sensible defaults

- Keep default behavior identical to the current tool (uniform on [0.2, 0.8] or whatever baseline you have) until the user explicitly selects the mixture model.  
- When mixture is selected, default to:  
  - `p_full_price = 0.8`  
  - Full-price mode = fixed at 1.0.  
  - Discount distribution = uniform, `min_discount_multiplier = 0.6` (e.g., 40% max discount).

***

## 5. Validation and constraints

- Enforce:  
  - `0 ≤ p_full_price ≤ 1`.  
  - `0 < min_discount_multiplier < 1`.  
  - For beta: `discount_beta_alpha > 0`, `discount_beta_beta > 0`.  
- Guardrails:  
  - If user picks `min_discount_multiplier >= 1.0`, show an error: “Minimum discount multiplier must be less than 1.0 to represent a discount.”

***

## 6. Testing / acceptance criteria

The feature is considered complete when:

1. With **mixture disabled**, simulation results match (within random noise) the previous version.  
2. With **mixture enabled** and `p_full_price = 1.0`, all sampled multipliers are ≈ 1.0 (subject to full_price_mode); savings distribution behaves like “no discount” scenario.  
3. With **mixture enabled** and `p_full_price = 0.0`, all multipliers come from the discount distribution; behavior matches a pure discount model.  
4. UI clearly indicates which price model is in use and validates user inputs.  
5. Code is structured so `sample_price_multipliers_mixture` is unit-testable independently from the UI.

This supplement should give a GenAI coding agent enough structure to modify the existing tool, add the mixture-distribution logic, and expose it cleanly through the UI.
