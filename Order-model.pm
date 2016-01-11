package Fap::Model::Fcs::Backend::Result::Order;

use strict;
use warnings;

use base 'Fap::Model::DBIx::Result';

__PACKAGE__->table("orders");
__PACKAGE__->add_columns(
  "order_id",
  {
    data_type => "integer",
    extra => { unsigned => 1 },
    is_auto_increment => 1,
    is_nullable => 0,
  },
  "transaction_submit_id",
  {
    data_type => "integer",
    extra => { unsigned => 1 },
    is_foreign_key => 1,
    is_nullable => 1,
  },
  "prepay_amount",
  {
    data_type => "decimal",
    default_value => "0.00",
    is_nullable => 0,
    size => [10, 2],
  },
  "one_time_total",
  {
    data_type => "decimal",
    default_value => "0.00",
    is_nullable => 0,
    size => [10, 2],
  },
  "mrc_total",
  {
    data_type => "decimal",
    default_value => "0.00",
    is_nullable => 0,
    size => [10, 2],
  },
  "contract_total",
  {
    data_type => "decimal",
    default_value => "0.00",
    is_nullable => 0,
    size => [10, 2],
  },
  "contract_balance",
  {
    data_type => "decimal",
    default_value => "0.00",
    is_nullable => 0,
    size => [10, 2],
  },
  "avg_cost_per_user",
  {
    data_type => "decimal",
    default_value => "0.00",
    is_nullable => 0,
    size => [10, 2],
  },
  "cost_add_user",
  { data_type => "varchar", default_value => "", is_nullable => 0, size => 255 },
  "term_in_months",
  {
    data_type => "integer",
    default_value => 12,
    extra => { unsigned => 1 },
    is_nullable => 0,
  },
  "contract_start_date",
  {
    data_type     => "timestamp",
    default_value => "1970-01-01 00:00:00",
    is_nullable   => 0,
  },
  "billing_interval_in_months",
  {
    data_type => "integer",
    default_value => 1,
    extra => { unsigned => 1 },
    is_nullable => 0,
  },
  "reseller_id",
  { data_type => "integer", extra => { unsigned => 1 }, is_nullable => 1 },
  "customer_id",
  { data_type => "integer", extra => { unsigned => 1 }, is_nullable => 1 },
  "contact_id",
  {
    data_type => "integer",
    extra => { unsigned => 1 },
    is_foreign_key => 1,
    is_nullable => 0,
  },
  "company_name",
  { data_type => "varchar", is_nullable => 0, size => 80 },
  "website",
  { data_type => "varchar", default_value => "", is_nullable => 0, size => 255 },
  "industry",
  { data_type => "varchar", default_value => "", is_nullable => 0, size => 255 },
  "netsuite_entity_id",
  { data_type => "bigint", extra => { unsigned => 1 }, is_nullable => 0 },
  "netsuite_salesperson_id",
  { data_type => "integer", extra => { unsigned => 1 }, is_nullable => 1 },
  "credit_card_id",
  {
    data_type => "integer",
    extra => { unsigned => 1 },
    is_foreign_key => 1,
    is_nullable => 1,
  },
  "payment_method_id",
  {
    data_type => "integer",
    extra => { unsigned => 1 },
    is_foreign_key => 1,
    is_nullable => 1,
  },
  "order_status_id",
  {
    data_type => "integer",
    extra => { unsigned => 1 },
    is_foreign_key => 1,
    is_nullable => 1,
  },
  "order_creator_id",
  { data_type => "integer", extra => { unsigned => 1 }, is_nullable => 1 },
  "provisioning_status_id",
  {
    data_type => "integer",
    extra => { unsigned => 1 },
    is_foreign_key => 1,
    is_nullable => 1,
  },
  "note",
  { data_type => "mediumtext", is_nullable => 0 },
  "proposal_pdf",
  { data_type => "varchar", is_nullable => 1, size => 255 },
  "manager_reviewer_id",
  { data_type => "integer", extra => { unsigned => 1 }, is_nullable => 1 },
  "manager_approval_status_id",
  {
    data_type => "integer",
    extra => { unsigned => 1 },
    is_foreign_key => 1,
    is_nullable => 1,
  },
  "manager_approval_date",
  {
    data_type     => "timestamp",
    default_value => "1970-01-01 00:00:00",
    is_nullable   => 0,
  },
  "billing_reviewer_id",
  { data_type => "integer", extra => { unsigned => 1 }, is_nullable => 1 },
  "billing_approval_status_id",
  {
    data_type => "integer",
    extra => { unsigned => 1 },
    is_foreign_key => 1,
    is_nullable => 1,
  },
  "billing_approval_date",
  {
    data_type     => "timestamp",
    default_value => "1970-01-01 00:00:00",
    is_nullable   => 0,
  },
  "credit_reviewer_id",
  { data_type => "integer", extra => { unsigned => 1 }, is_nullable => 1 },
  "credit_approval_status_id",
  {
    data_type => "integer",
    extra => { unsigned => 1 },
    is_foreign_key => 1,
    is_nullable => 1,
  },
  "credit_approval_date",
  {
    data_type     => "timestamp",
    default_value => "1970-01-01 00:00:00",
    is_nullable   => 0,
  },
  "approval_comment",
  { data_type => "mediumtext", is_nullable => 0 },
  "order_type",
  {
    data_type => "enum",
    default_value => "NEW",
    extra => { list => ["NEW", "ADDON"] },
    is_nullable => 0,
  },
  "record_type",
  {
    data_type => "enum",
    default_value => "QUOTE",
    extra => { list => ["QUOTE", "ORDER"] },
    is_nullable => 0,
  },
  "quote_expiry",
  {
    data_type     => "timestamp",
    default_value => "1970-01-01 00:00:00",
    is_nullable   => 0,
  },
  "created",
  {
    data_type     => "timestamp",
    default_value => "1970-01-01 00:00:00",
    is_nullable   => 0,
  },
  "updated",
  {
    data_type     => "timestamp",
    default_value => \"current_timestamp",
    is_nullable   => 0,
  },
);
__PACKAGE__->set_primary_key("order_id");
__PACKAGE__->has_many(
  "billing_schedules",
  "Fap::Model::Fcs::Backend::Result::BillingSchedule",
  { "foreign.order_id" => "self.order_id" },
  { cascade_copy => 0, cascade_delete => 0 },
);
__PACKAGE__->has_many(
  "order_discounts",
  "Fap::Model::Fcs::Backend::Result::OrderDiscount",
  { "foreign.order_id" => "self.order_id" },
  { cascade_copy => 0, cascade_delete => 0 },
);
__PACKAGE__->has_many(
  "order_groups",
  "Fap::Model::Fcs::Backend::Result::OrderGroup",
  { "foreign.order_id" => "self.order_id" },
  { cascade_copy => 0, cascade_delete => 0 },
);
__PACKAGE__->belongs_to(
  "credit_card",
  "Fap::Model::Fcs::Backend::Result::EntityCreditCard",
  { entity_credit_card_id => "credit_card_id" },
  {
    is_deferrable => 1,
    join_type     => "LEFT",
    on_delete     => "CASCADE",
    on_update     => "CASCADE",
  },
);
__PACKAGE__->belongs_to(
  "order_status",
  "Fap::Model::Fcs::Backend::Result::OrderStatus",
  { order_status_id => "order_status_id" },
  {
    is_deferrable => 1,
    join_type     => "LEFT",
    on_delete     => "CASCADE",
    on_update     => "CASCADE",
  },
);
__PACKAGE__->belongs_to(
  "provisioning_status",
  "Fap::Model::Fcs::Backend::Result::OrderStatus",
  { order_status_id => "provisioning_status_id" },
  {
    is_deferrable => 1,
    join_type     => "LEFT",
    on_delete     => "CASCADE",
    on_update     => "CASCADE",
  },
);
__PACKAGE__->belongs_to(
  "manager_approval_status",
  "Fap::Model::Fcs::Backend::Result::OrderStatus",
  { order_status_id => "manager_approval_status_id" },
  {
    is_deferrable => 1,
    join_type     => "LEFT",
    on_delete     => "CASCADE",
    on_update     => "CASCADE",
  },
);
__PACKAGE__->belongs_to(
  "billing_approval_status",
  "Fap::Model::Fcs::Backend::Result::OrderStatus",
  { order_status_id => "billing_approval_status_id" },
  {
    is_deferrable => 1,
    join_type     => "LEFT",
    on_delete     => "CASCADE",
    on_update     => "CASCADE",
  },
);
__PACKAGE__->belongs_to(
  "credit_approval_status",
  "Fap::Model::Fcs::Backend::Result::OrderStatus",
  { order_status_id => "credit_approval_status_id" },
  {
    is_deferrable => 1,
    join_type     => "LEFT",
    on_delete     => "CASCADE",
    on_update     => "CASCADE",
  },
);
__PACKAGE__->belongs_to(
  "contact",
  "Fap::Model::Fcs::Backend::Result::EntityContact",
  { entity_contact_id => "contact_id" },
  { is_deferrable => 1, on_delete => "CASCADE", on_update => "CASCADE" },
);
__PACKAGE__->belongs_to(
  "payment_method",
  "Fap::Model::Fcs::Backend::Result::PaymentMethod",
  { payment_method_id => "payment_method_id" },
  {
    is_deferrable => 1,
    join_type     => "LEFT",
    on_delete     => "CASCADE",
    on_update     => "CASCADE",
  },
);
__PACKAGE__->belongs_to(
  "transaction_submit",
  "Fap::Model::Fcs::Backend::Result::TransactionSubmit",
  { transaction_submit_id => "transaction_submit_id" },
  {
    is_deferrable => 1,
    join_type     => "LEFT",
    on_delete     => "CASCADE",
    on_update     => "CASCADE",
  },
);
__PACKAGE__->has_many( order_transaction => 'Fap::Model::Fcs::Backend::Result::OrderTransaction', { 'foreign.order_id' => 'self.order_id' } );

sub column_defaults {
	my $self = shift;
	return {
		created=>\'NULL',
	}
}
1;
