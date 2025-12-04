import torch
from transformers import BertForSequenceClassification, BertTokenizer

class FinancialBERT:
    def __init__(self, model_name="bert-base-uncased", num_labels=3):
        self.model_name = model_name
        self.num_labels = num_labels
        self.tokenizer = BertTokenizer.from_pretrained(model_name)
        self.model = BertForSequenceClassification.from_pretrained(
            model_name, 
            num_labels=num_labels
        )

    def save_pretrained(self, save_directory):
        self.model.save_pretrained(save_directory)
        self.tokenizer.save_pretrained(save_directory)

    @classmethod
    def from_pretrained(cls, load_directory):
        instance = cls()
        instance.model = BertForSequenceClassification.from_pretrained(load_directory)
        instance.tokenizer = BertTokenizer.from_pretrained(load_directory)
        return instance
