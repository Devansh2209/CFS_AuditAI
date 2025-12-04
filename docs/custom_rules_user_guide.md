# Custom Rules: User Guide & Frontend UI

## What Are Custom Rules?

Custom rules allow **enterprise customers** to teach the AI their company-specific classification preferences. Think of it as "training" the system without actually retraining the BERT model.

---

## Real-World Use Cases

### Use Case 1: SaaS Company - Cloud Infrastructure
**Problem**: AI classifies "AWS credits" as **Investing** (because of the word "purchase")  
**Solution**: Create custom rule

```json
{
  "rule_name": "AWS Cloud Costs are Operating",
  "conditions": {
    "description_contains": ["AWS", "cloud", "Azure", "GCP"],
    "amount_range": { "min": 0, "max": 100000 }
  },
  "action": {
    "category": "Operating",
    "note": "Cloud infrastructure is an operating expense for our SaaS business"
  }
}
```

**Result**: All AWS/cloud transactions under $100K → Operating

---

### Use Case 2: Manufacturing - Equipment Leases
**Problem**: Company leases equipment instead of buying. AI might classify as Investing.  
**Solution**: Custom rule for leases

```json
{
  "rule_name": "Equipment Leases are Operating",
  "conditions": {
    "description_contains": ["lease", "rental"],
    "vendor_matches": ["United Rentals", "Sunbelt Rentals"]
  },
  "action": {
    "category": "Operating",
    "note": "Per ASC 842, operating leases are operating activities"
  }
}
```

---

### Use Case 3: Retail - Seasonal Inventory
**Problem**: Large inventory purchases before holidays should be flagged for review  
**Solution**: Custom rule with review flag

```json
{
  "rule_name": "Large Inventory Purchases Need Review",
  "conditions": {
    "description_contains": ["inventory", "merchandise"],
    "amount_range": { "min": 500000 },
    "date_range": { "start": "2024-10-01", "end": "2024-12-31" }
  },
  "action": {
    "category": "Operating",
    "flag_for_review": true,
    "note": "Large Q4 inventory purchase - verify with purchasing team"
  }
}
```

---

## Frontend User Interface

### 1. Custom Rules Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Custom Classification Rules                    [+ New Rule] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🟢 Active Rules (3)                                         │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ AWS Cloud Costs are Operating              Priority: 150│  │
│  │ Matches: "AWS", "cloud", "Azure"                       │  │
│  │ → Operating                                            │  │
│  │ Applied 1,247 times this month                         │  │
│  │                                    [Edit] [Test] [Delete]│  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Equipment Leases are Operating             Priority: 120│  │
│  │ Matches: "lease", "rental"                             │  │
│  │ → Operating                                            │  │
│  │ Applied 45 times this month                            │  │
│  │                                    [Edit] [Test] [Delete]│  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ⚠️  Conflicts Detected (1)                                  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Software License Purchases                             │  │
│  │ AI suggests: Operating (85%)                           │  │
│  │ Your rule suggests: Investing (90%)                    │  │
│  │ → Needs review                          [Review] [Fix] │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Create New Rule Form

```
┌─────────────────────────────────────────────────────────────┐
│  Create Custom Rule                                    [Save]│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Rule Name *                                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ AWS Cloud Costs are Operating                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Description (optional)                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Classify all AWS and cloud infrastructure costs as  │    │
│  │ operating expenses for our SaaS business model      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ─────────────────────────────────────────────────────────  │
│  Conditions (When to apply this rule)                        │
│  ─────────────────────────────────────────────────────────  │
│                                                               │
│  Description contains (any of these keywords)                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ AWS, cloud, Azure, GCP, Google Cloud      [+ Add]   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Amount range (optional)                                     │
│  Min: ┌──────┐  Max: ┌──────────┐                           │
│       │  0   │       │ 100,000  │                            │
│       └──────┘       └──────────┘                            │
│                                                               │
│  Vendor matches (optional)                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Amazon Web Services, AWS                  [+ Add]   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Date range (optional)                                       │
│  From: ┌────────────┐  To: ┌────────────┐                   │
│        │ 2024-01-01 │      │ 2024-12-31 │                   │
│        └────────────┘      └────────────┘                    │
│                                                               │
│  ─────────────────────────────────────────────────────────  │
│  Action (What to do when rule matches)                       │
│  ─────────────────────────────────────────────────────────  │
│                                                               │
│  Classify as *                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ● Operating   ○ Investing   ○ Financing            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Add note (appears in audit trail)                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Cloud infrastructure costs for SaaS operations      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ☐ Flag for manual review                                   │
│                                                               │
│  Priority (higher = evaluated first)                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 150  ◄──────────────────────────────────────────►   │    │
│  │      Low (0)              High (1000)                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│                                    [Test Rule] [Save Rule]   │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Test Rule Before Saving

```
┌─────────────────────────────────────────────────────────────┐
│  Test Rule: AWS Cloud Costs are Operating                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Upload test transactions (CSV or paste)                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Description                          Amount          │    │
│  │ AWS cloud infrastructure             $5,000          │    │
│  │ Azure hosting services               $3,200          │    │
│  │ Purchase of equipment                $50,000         │    │
│  │ Google Cloud Platform                $1,800          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│                                              [Run Test]       │
│                                                               │
│  ─────────────────────────────────────────────────────────  │
│  Test Results                                                │
│  ─────────────────────────────────────────────────────────  │
│                                                               │
│  ✅ AWS cloud infrastructure → Operating (MATCH)            │
│  ✅ Azure hosting services → Operating (MATCH)              │
│  ❌ Purchase of equipment → No match (AI will classify)     │
│  ✅ Google Cloud Platform → Operating (MATCH)               │
│                                                               │
│  📊 Match Rate: 75% (3 of 4 transactions)                   │
│                                                               │
│                                    [Adjust Rule] [Save Rule] │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Rule Analytics Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Rule Performance Analytics                    Last 30 Days  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Top Performing Rules                                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Rule Name                    Applied    Accuracy     │    │
│  │ AWS Cloud Costs              1,247      98.5%        │    │
│  │ Equipment Leases             45         100%         │    │
│  │ Software Licenses            234        92.3%        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Conflicts Requiring Review                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 12 transactions flagged for manual review           │    │
│  │ [View Conflicts]                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Rule Execution Time                                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Average: 5.2ms                                       │    │
│  │ P95: 8.7ms                                           │    │
│  │ [View Details]                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## User Workflow

### Step 1: User Notices Misclassification
```
Transaction: "AWS cloud infrastructure - $5,000"
AI Classification: Investing (75% confidence)
User thinks: "This should be Operating!"
```

### Step 2: Create Custom Rule
1. Click **[+ New Rule]**
2. Fill in conditions: "AWS", "cloud"
3. Set action: Operating
4. Add note: "Cloud costs are operating expenses"
5. Set priority: 150 (high)

### Step 3: Test Rule
1. Upload sample transactions
2. See which ones match
3. Adjust conditions if needed

### Step 4: Save & Apply
1. Save rule
2. Rule applies to all future transactions automatically
3. Past transactions can be reclassified (batch update)

### Step 5: Monitor Performance
1. View analytics dashboard
2. See how many times rule applied
3. Check for conflicts with AI
4. Adjust as needed

---

## Benefits for Users

### For Accountants
- ✅ **No coding required** - Simple form-based interface
- ✅ **Test before applying** - See results before committing
- ✅ **Audit trail** - Every rule application is logged
- ✅ **Override AI** - Your rules take precedence

### For Controllers
- ✅ **Company-specific logic** - Encode your GAAP interpretations
- ✅ **Consistency** - Same rules apply to all transactions
- ✅ **Compliance** - Document why classifications were made
- ✅ **Analytics** - Track rule performance

### For Auditors
- ✅ **Transparency** - See exactly which rules were applied
- ✅ **Traceability** - Full audit trail
- ✅ **Documentation** - Rules include reasoning and GAAP references
- ✅ **Review flags** - Uncertain transactions flagged automatically

---

## Advanced Features

### 1. Rule Templates
Pre-built rules for common scenarios:
- "Cloud Infrastructure Costs (SaaS)"
- "Equipment Leases (Manufacturing)"
- "Software Licenses (Tech)"
- "Inventory Purchases (Retail)"

### 2. Bulk Import
Upload CSV of rules:
```csv
rule_name,keywords,category,priority
AWS Costs,AWS|cloud,Operating,150
Equipment Leases,lease|rental,Operating,120
```

### 3. Rule Suggestions
AI suggests rules based on corrections:
```
You've corrected "AWS" transactions 5 times.
Create a rule? [Yes] [No]
```

### 4. Conflict Resolution
When AI and rule disagree:
```
⚠️ Conflict Detected
AI: Investing (85%)
Your Rule: Operating (90%)

What should we do?
○ Use my rule (recommended)
○ Use AI
○ Flag for review
```

---

## API Integration (for Developers)

Enterprise customers can also use the API:

```javascript
// Create rule programmatically
const response = await fetch('/api/v1/rules/custom', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' },
  body: JSON.stringify({
    client_id: 123,
    rule_name: 'AWS Cloud Costs',
    conditions: {
      description_contains: ['AWS', 'cloud'],
      amount_range: { min: 0, max: 100000 }
    },
    action: {
      category: 'Operating',
      note: 'Cloud infrastructure costs'
    },
    priority: 150
  })
});
```

---

## Bottom Line

**Custom Rules** = Enterprise customers can teach the AI their company-specific preferences without needing to retrain the BERT model.

**Frontend UI** = Simple, intuitive interface that accountants (not developers) can use.

**Result** = 95%+ accuracy tailored to each company's specific needs!
