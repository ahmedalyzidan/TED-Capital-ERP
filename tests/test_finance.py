import pytest
from decimal import Decimal, ROUND_HALF_UP

# ملاحظة: استبدل app.logic بالمسار الحقيقي لدوال الحسابات عندك
# from app.logic.accounting import calculate_invoice_total

@pytest.mark.finance
def test_accounting_precision():
    """اختبار يمنع أخطاء الكسور العشرية القاتلة في المبالغ الكبيرة"""
    # مثال لعملية حسابية معقدة (سعر * كمية + ضريبة)
    unit_price = Decimal('199.99')
    quantity = Decimal('3')
    tax_rate = Decimal('0.14') # 14%
    
    subtotal = unit_price * quantity
    tax_amount = subtotal * tax_rate
    total = subtotal + tax_amount
    
    # التقريب لقرشين فقط
    final_total = total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    expected = Decimal('683.97') # الحسبة الصحيحة يدوياً
    assert final_total == expected, f"خطأ في الدقة المالية: الناتج {final_total} والمفترض {expected}"

@pytest.mark.finance
def test_ledger_balance():
    """اختبار توازن القيد المزدوج: المدين يجب أن يساوي الدائن"""
    entry = {
        "debit": [Decimal('1000.00')],
        "credit": [Decimal('700.00'), Decimal('300.00')]
    }
    assert sum(entry["debit"]) == sum(entry["credit"]), "القيد المحاسبي غير متوازن!"