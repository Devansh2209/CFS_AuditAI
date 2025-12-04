import csv
import random
import math
from datetime import datetime, timedelta

def generate_synthetic_data(num_samples=1000):
    """
    Generates synthetic financial transaction data for training the Cash Flow Statement classifier.
    Uses standard libraries only to avoid dependency issues.
    """
    
    # Define categories and their typical transaction patterns
    categories = {
        'Operating': [
            ('Revenue from customers', ['Payment received from client', 'Invoice #12345 payment', 'Service revenue', 'Subscription renewal']),
            ('Payments to suppliers', ['Payment to vendor', 'Office supplies purchase', 'Utility bill payment', 'Cloud hosting fee']),
            ('Payments to employees', ['Payroll run', 'Salary payment', 'Employee reimbursement', 'Bonus payout']),
            ('Interest paid', ['Interest payment on loan', 'Bank loan interest', 'Monthly interest charge']),
            ('Taxes paid', ['Corporate tax payment', 'Sales tax remittance', 'IRS payment', 'State tax payment'])
        ],
        'Investing': [
            ('Purchase of PPE', ['Purchase of new machinery', 'Laptop acquisition', 'Office furniture purchase', 'Building renovation cost']),
            ('Sale of PPE', ['Sale of old equipment', 'Disposal of vehicle', 'Proceeds from asset sale']),
            ('Purchase of investments', ['Purchase of marketable securities', 'Investment in bonds', 'Stock purchase']),
            ('Sale of investments', ['Sale of stock portfolio', 'Redemption of bonds', 'Investment maturity proceeds'])
        ],
        'Financing': [
            ('Proceeds from debt', ['Loan disbursement', 'Line of credit draw', 'Bond issuance proceeds']),
            ('Repayment of debt', ['Principal repayment', 'Loan payoff', 'Mortgage principal payment']),
            ('Dividends paid', ['Quarterly dividend payment', 'Shareholder distribution', 'Dividend payout']),
            ('Issuance of equity', ['Capital injection', 'Seed funding received', 'Series A investment']),
            ('Repurchase of equity', ['Stock buyback', 'Treasury stock purchase', 'Share repurchase'])
        ]
    }

    data = []
    start_date = datetime(2023, 1, 1)
    
    # Header
    header = ['amount', 'description', 'date', 'account_code', 'counterparty', 'label']
    data.append(header)

    for _ in range(num_samples):
        # Select a main category (weighted slightly towards Operating as it's most common)
        # Simple weighted choice logic
        r = random.random()
        if r < 0.7:
            category = 'Operating'
        elif r < 0.85:
            category = 'Investing'
        else:
            category = 'Financing'
        
        # Select a sub-category and description pattern
        sub_cat_options = categories[category]
        sub_cat, descriptions = random.choice(sub_cat_options)
        base_desc = random.choice(descriptions)
        
        # Add some randomness to description
        if random.random() > 0.5:
            desc = f"{base_desc} - Ref: {random.randint(1000, 9999)}"
        else:
            desc = base_desc

        # Generate amount (log-normal simulation using standard math)
        # Box-Muller transform for normal distribution
        u1 = random.random()
        u2 = random.random()
        z0 = math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)
        
        if category == 'Operating':
            # Mean 8, Sigma 1.5
            log_amount = 8 + z0 * 1.5
        elif category == 'Investing':
            # Mean 10, Sigma 2.0
            log_amount = 10 + z0 * 2.0
        else: # Financing
            # Mean 11, Sigma 2.5
            log_amount = 11 + z0 * 2.5
            
        amount = round(math.exp(log_amount), 2)
            
        # Random date within the last year
        date = start_date + timedelta(days=random.randint(0, 365))
        
        # Mock account codes and counterparties
        account_code = f"{random.randint(1000, 9999)}"
        counterparty = f"Vendor_{random.randint(1, 100)}" if category == 'Operating' else "Bank/Entity"

        data.append([
            amount,
            desc,
            date.strftime('%Y-%m-%d'),
            account_code,
            counterparty,
            category
        ])

    return data

if __name__ == "__main__":
    print("Generating synthetic training data...")
    data = generate_synthetic_data(2000)
    output_path = "train.csv"
    
    with open(output_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerows(data)
        
    print(f"Successfully generated {len(data)-1} samples saved to {output_path}")
