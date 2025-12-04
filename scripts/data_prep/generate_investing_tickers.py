#!/usr/bin/env python3
"""
Generate Investing-Heavy Ticker List
Creates a list of tickers for companies likely to have many Investing transactions
(CapEx, Acquisitions, Property Purchases, Investments)
"""

import csv

# Expanded list of ~1000 tickers across all major sectors to ensure we hit 10k transactions
ALL_TICKERS = [
    # Technology
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'INTC', 'AMD', 'CRM', 'ADBE', 'CSCO', 'ORCL', 'IBM', 'QCOM', 'TXN', 'AVGO', 'MU', 'LRCX', 'AMAT', 'NOW', 'UBER', 'ABNB', 'SNOW', 'PLTR', 'PANW', 'FTNT', 'WDAY', 'ADSK', 'TEAM', 'ZM', 'DDOG', 'ZS', 'CRWD', 'NET', 'MDB', 'OKTA', 'DOCU', 'SPLK', 'SNPS', 'CDNS', 'ANSS', 'PTC', 'BSY', 'Unity', 'RBLX', 'PATH', 'U', 'AI', 'PLUG', 'ENPH', 'SEDG', 'FSLR', 'RUN', 'SPWR', 'NOVA', 'SHLS', 'ARRY', 'CSIQ', 'DQ', 'JKS',
    # Financials (Banks/Insurance/Asset Management)
    'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'BLK', 'SCHW', 'AXP', 'V', 'MA', 'PYPL', 'SQ', 'COF', 'USB', 'PNC', 'TFC', 'BK', 'STT', 'FITB', 'KEY', 'CFG', 'HBAN', 'RF', 'MTB', 'SIVB', 'FRC', 'SBNY', 'WAL', 'PACW', 'CMA', 'ZION', 'NYCB', 'FHN', 'EWBC', 'BOH', 'ASB', 'CFR', 'CBSH', 'WTFC', 'UMBF', 'ONB', 'FNB', 'PB', 'SF', 'RJF', 'LPLA', 'AMTD', 'IBKR', 'VIRT', 'CBOE', 'ICE', 'NDAQ', 'MCO', 'SPGI', 'MSCI', 'FICO', 'BRK.B', 'TRV', 'ALL', 'PGR', 'CB', 'HIG', 'CINF', 'AIG', 'MET', 'PRU', 'LNC', 'PFG', 'UNM', 'AFL',
    # Healthcare
    'JNJ', 'PFE', 'MRK', 'ABBV', 'LLY', 'BMY', 'AMGN', 'GILD', 'VRTX', 'REGN', 'TMO', 'DHR', 'ABT', 'MDT', 'SYK', 'BSX', 'EW', 'ZBH', 'BAX', 'BDX', 'ISRG', 'ALGN', 'COO', 'RMD', 'STE', 'WAT', 'MTD', 'PKI', 'A', 'BIO', 'TFX', 'HOLX', 'DXCM', 'PODD', 'GMED', 'PEN', 'NVCR', 'ICUI', 'ATRC', 'MASI', 'LIVN', 'NUVA', 'SIBN', 'GKOS', 'AXNX', 'SWAV', 'INSP', 'OMCL', 'ANGO', 'CRY', 'UNH', 'CVS', 'CI', 'ELV', 'HUM', 'CNC', 'MOH', 'HCA', 'UHS', 'THC', 'CYH', 'ACHC', 'EHC', 'ENSG', 'NHC', 'ADUS', 'AMN', 'SEM',
    # Consumer Discretionary
    'AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'LOW', 'TGT', 'TJX', 'BKNG', 'LVS', 'MGM', 'WYNN', 'MAR', 'HLT', 'H', 'ABNB', 'EXPE', 'CCL', 'RCL', 'NCLH', 'CMG', 'YUM', 'DRI', 'DPZ', 'WEN', 'TXRH', 'CAKE', 'PZZA', 'WING', 'SHAK', 'JACK', 'PLAY', 'DIN', 'BJRI', 'CHUY', 'RRGB', 'EAT', 'DENN', 'BLMN', 'CBRL', 'RUTH', 'STKS', 'F', 'GM', 'STLA', 'TM', 'HMC', 'HOG', 'PII', 'THO', 'WGO', 'LCII', 'PATK', 'FOXF', 'TPX', 'LZB', 'ETH', 'BSET', 'LEG', 'MHK', 'DHI', 'LEN', 'PHM', 'NVR', 'TOL', 'KBH', 'TMHC', 'MDC', 'MTH', 'TPH',
    # Industrials
    'CAT', 'DE', 'GE', 'BA', 'MMM', 'HON', 'LMT', 'RTX', 'GD', 'NOC', 'EMR', 'ETN', 'ITW', 'PH', 'CMI', 'PCAR', 'ROK', 'AME', 'DOV', 'XYL', 'GWW', 'FAST', 'URI', 'PWR', 'J', 'KBR', 'FLR', 'ACM', 'VMI', 'PNR', 'NDSN', 'IEX', 'SWK', 'SNA', 'WSM', 'TTC', 'AGCO', 'CNH', 'OSK', 'TEX', 'MTW', 'ASTE', 'ALG', 'WSO', 'LII', 'CARR', 'TT', 'JCI', 'GFF', 'FIX', 'EME', 'MTZ', 'PRIM', 'DY', 'IEA', 'MYRG', 'STRL', 'GVA', 'Tutor', 'Perini', 'ROAD', 'USCR', 'VMC', 'MLM', 'SUM', 'EXP', 'NUE', 'STLD', 'CLF', 'X', 'RS',
    # Energy
    'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PXD', 'MPC', 'PSX', 'VLO', 'OXY', 'HES', 'KMI', 'WMB', 'OKE', 'TRGP', 'HAL', 'BKR', 'DVN', 'FANG', 'MRO', 'APA', 'CTRA', 'EQT', 'CHK', 'SWN', 'RRC', 'AR', 'MTDR', 'PDCE', 'CIVI', 'MUR', 'MRO', 'OVV', 'CLR', 'VNOM', 'FANG', 'DINO', 'PBF', 'DK', 'CVI', 'PARR', 'HFC', 'CLMT', 'GPRE', 'REX', 'REGI', 'DAR', 'VLO', 'MPC', 'PSX', 'OXY', 'KMI', 'WMB', 'OKE', 'TRGP', 'LNG', 'EPD', 'ET', 'MPLX', 'PAA', 'PAGP', 'WES', 'HEP', 'NS', 'NGL', 'CEQP', 'DCP', 'ENLC', 'USAC', 'GEL', 'MMP',
    # Real Estate (REITs)
    'SPG', 'PLD', 'AMT', 'CCI', 'O', 'DLR', 'EQIX', 'PSA', 'AVB', 'EQR', 'VTR', 'WELL', 'BXP', 'ARE', 'MAA', 'SUI', 'ESS', 'UDR', 'IRM', 'HST', 'VICI', 'GLPI', 'INVH', 'AMH', 'CPT', 'REG', 'KIM', 'FRT', 'NNN', 'STOR', 'WPC', 'SRC', 'ADC', 'EPR', 'LXP', 'OLP', 'GOOD', 'STAG', 'PLYM', 'ILPT', 'OPI', 'ONL', 'DEI', 'JBGS', 'VNO', 'SLG', 'ESRT', 'PGRE', 'KRC', 'HPP', 'CUZ', 'HIW', 'PDM', 'BDN', 'OFC', 'CIO', 'AAT', 'AHH', 'APTS', 'BRT', 'NXRT', 'IRT', 'CSR', 'UMH', 'ELS', 'SUI', 'RHP', 'SHO', 'DRH', 'XHR',
    # Utilities
    'NEE', 'DUK', 'SO', 'D', 'AEP', 'SRE', 'EXC', 'XEL', 'PEG', 'WEC', 'ES', 'ED', 'DTE', 'ETR', 'PPL', 'AEE', 'CMS', 'CNP', 'FE', 'ATO', 'NI', 'EVRG', 'LNT', 'PNW', 'IDA', 'OGE', 'ALE', 'POR', 'BKH', 'NWE', 'AVA', 'OTTR', 'MGEE', 'SR', 'SWX', 'NJR', 'SJI', 'UGI', 'SR', 'CPK', 'NWA', 'ARTNA', 'AWK', 'WTRG', 'AWR', 'CWT', 'SJW', 'YORW', 'MSEX', 'GWRS', 'CWCO', 'PCG', 'EIX', 'ETR', 'FE', 'AEP', 'D', 'SO', 'DUK', 'NEE', 'SRE', 'CNP', 'CMS', 'DTE', 'ES', 'ED', 'PEG', 'XEL', 'WEC', 'EIX',
    # Materials
    'LIN', 'APD', 'SHW', 'ECL', 'CTVA', 'DOW', 'NUE', 'FCX', 'LYB', 'PPG', 'NEM', 'VMC', 'MLM', 'ALB', 'FMC', 'CF', 'MOS', 'EMN', 'CE', 'AVY', 'BALL', 'PKG', 'IP', 'WRK', 'SEE', 'BERY', 'CCK', 'ATR', 'SON', 'GEF', 'GPK', 'SLGN', 'OI', 'KRO', 'HUN', 'CC', 'TROX', 'ASH', 'VAL', 'GCP', 'IOSP', 'NEU', 'KWR', 'MATV', 'SCL', 'HWKN', 'TREX', 'AZEK', 'SITE', 'BECN', 'GMS', 'BLDR', 'UFPI', 'STLD', 'CLF', 'X', 'RS', 'CMC', 'WOR', 'ATI', 'CRS', 'HAYN', 'TMST', 'KALU', 'CENX', 'AA', 'ACH', 'MTRN', 'RYI',
    # Communication Services
    'GOOGL', 'META', 'NFLX', 'DIS', 'CMCSA', 'TMUS', 'VZ', 'T', 'CHTR', 'WBD', 'PARA', 'LUMN', 'FYBR', 'ATUS', 'DISH', 'SBAC', 'AMT', 'CCI', 'GOGO', 'IRDM', 'GSAT', 'ORAN', 'VOD', 'TEF', 'BCE', 'TU', 'RCI', 'SJR', 'LBTYA', 'LBTYK', 'LILA', 'LILAK', 'FWONA', 'FWONK', 'LSXMA', 'LSXMK', 'SIRI', 'BATRA', 'BATRK', 'DISH', 'SATS', 'VSAT', 'GILT', 'CMCSA', 'CHTR', 'ATUS', 'CABO', 'WOW', 'T', 'VZ', 'TMUS', 'USM', 'TDS', 'CBB', 'CNSL', 'FTR', 'WIN', 'UNIT', 'ZAYO', 'EQIX', 'DLR', 'COR', 'CONE', 'QTS', 'LSI',
]

def generate_full_list():
    """Return the unique sorted list of tickers"""
    return sorted(list(set(ALL_TICKERS)))

def main():
    tickers = generate_full_list()
    
    output_file = 'v30_data/investing_tickers.csv'
    
    with open(output_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['ticker'])
        for ticker in tickers:
            writer.writerow([ticker])
            
    print(f"Generated {len(tickers)} targeted tickers for Investing boost.")
    print(f"Saved to {output_file}")
    
    # Print sample
    print("\nSample tickers:")
    print(", ".join(tickers[:20]))

if __name__ == '__main__':
    main()
