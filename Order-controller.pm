package Fap::Order;
use strict;
use Fap;
use Fap::Util;
use Fap::Model::Fcs;
use Fap::External::NetSuite;
use Fap::Data::Countries;
=head2 new

=over 4

Create a new instance of Order object

Args: order_id
Returns: $self

=back

=cut

sub new {
    my $subname = 'Fap::Order::new';
    my ( $class, %args ) = @_;
    my $fcs_schema    = $args{fcs_schema}||Fap::Model::Fcs->new();
    my $self          = bless {
        order_id      => $args{order_id},
        fcs_schema    => $fcs_schema,
    }, $class;
 
    $self->{'details'} = $self->get_details();

    return $self;
}

=head2 set_status

Modifies the status of order

Args: status
Returns: 0 if no update is needed, 1 successful update, undef if unrecognized status

=cut

sub set_status {
    my $self   = shift;
    my $status = shift;

    return(_set_status($self, $status, 'order_status_id'));
}

=head2 set_manager_approval_status

Modifies the status of manager_approval_status_id

Args: status
Returns: 0 if no update is needed, 1 successful update, undef if unrecognized status

=cut

sub set_manager_approval_status {
    my $self   = shift;
    my $status = shift;

    return(_set_status($self, $status, 'manager_approval_status_id'));
}

=head2 set_credit_approval_status

Modifies the status of credit_approval_status_id

Args: status
Returns: 0 if no update is needed, 1 successful update, undef if unrecognized status

=cut

sub set_credit_approval_status {
    my $self   = shift;
    my $status = shift;

    return(_set_status($self, $status, 'credit_approval_status_id'));
}

=head2 set_billing_approval_status

Modifies the status of billing_approval_status_id

Args: status
Returns: 0 if no update is needed, 1 successful update, undef if unrecognized status

=cut

sub set_billing_approval_status {
    my $self   = shift;
    my $status = shift;

    return(_set_status($self, $status, 'billing_approval_status_id'));
}

=head2 _set_status

Internal method to modify a status of a supplied table.

Args: status - order_status.order_status_id -  corresponding to the order_status.name
      name   - the name of the table to change (order_status_id, credit_approval_status_id, billing_approval_status_id, etc)

Returns: 0 if no update is needed, 1 successful update, undef if unrecognized status

=cut

sub _set_status {
    my $self   = shift;
    my $status = shift;
    my $name   = shift;

    $status=~s/ /_/g;
    #Get a list of valid status
    my $status_list = Fap::Order::get_status_list();
    if ( my $status_id = $status_list->{lc($status)} ) {
        if ( $self->{'fcs_schema'}->table('order')->search( { order_id => $self->{'order_id'} } )->update({ $name => $status_id}) > 0 )

        {
            return 1;
        } else {
            Fap->trace_error("ERR: Unable to update $name status");
            return 0;
        }
    } else {
        Fap->trace_error("ERR: Attempted to update $name with an invalid status");
        return undef;
    }
}

=head2 get_details

Get order details via object method.  This uses get method.

Args:  
Returns: dbix row 

=cut

sub get_details {
    my $self = shift;
    my $order = get( $self, ( db => $self->{'fcs_schema'}, id => $self->{'order_id'}, as_hash => 1 ) );
    return defined $order ? {'order'=> $order} : undef;
}

# Fetch Order detail records

sub get {
    my ( $class, %args ) = @_;

    my $rec = $args{db}->table("Order")->find(
        { "me.order_id" => $args{id} },
        {   prefetch => [
                "contact", "order_status","manager_approval_status","credit_approval_status","billing_approval_status",
                { order_groups => ["shipping_address", { product => "deployment"}, { order_bundles => ["order_bundle_details", {bundle =>["category",{"bundle_price_models"=>"price_model"}] } ] } ] } ] } );
    if ($rec) {
        if ( $args{as_hash} ) {
            return ( $args{db}->strip($rec) );
        }
    }
    return $rec;
}

#### STATIC METHODS - No need to instantiate Order object to use ######

# This function will take a provisioning order id and will check for:
#   - there's a recordset for the order in order_group table
#   - each record in the recordset has a valid server_id
#   - there's a corresponding recordset for the order in order_bundle table
#
# Args: db - fcs database handle
#       order_id - provisioning order id
# Returns: 1 on success, undef on invalid input or if an error occured
sub validate_prov_order {
    my $db = shift;
    my $order_id = shift;
    my $args = shift;
	
    if ( !defined($db) || ref($db) ne 'Fap::Model::Fcs' ) {
        Fap->trace_error('ERR: Invalid fcs database handle');
        return undef;
    }

    if ( !defined($order_id) || $order_id !~ /^\d+$/ ) {
        Fap->trace_error('ERR: Invalid order id');
        return undef;
    }

	my $rs = $db->table('order_group')->search(
		{
			order_id => $order_id
		},
		{
			select => [ qw/order_group_id server_id/ ]
		}
	);
	
	if (!$rs->count) {
        Fap->trace_error("ERR: No order found with order id $order_id");
        return undef;
	}
	
	while (my $row = $rs->next) {
		my %data = $row->get_columns;

        if ( (!defined($args->{'skip_server_id'})) && (! Fap::Util::is_valid_server_id( $data{'server_id'} )) ) {
            Fap->trace_error( 'ERR: Invalid server id in order group ' . $data{'order_group_id'} );
            return undef;
        }
		
		my $rs = $db->table('order_bundle')->search( { order_group_id => $data{'order_group_id'} } );
		if (!defined($rs)) {
            Fap->trace_error( "ERR: order has no bundles. order_id = $order_id order_group_id = " . $data{'order_group_id'} );
            return undef;
		}
	}
	
    return 1;
}

sub import_from_netsuite {
        my ($class,$id) = @_;

        my $ns = Fap::External::NetSuite->new(mode=>"sandbox");
        my $cr = $ns->customer->get($id);
	if ($ns->hasError()) {
		return undef;
	}
	my $order_hash = {
		contact=>{
			website=>$cr->{url},
			email=>$cr->{email},
			email_confirm=>$cr->{email},
			company_name=>$cr->{companyName},
			first_name=>"",
			last_name=>"",
			phone=>$cr->{phone},
			industry=>"",
		},
		order_group=>[
			{
			product_id=>"",
			bundle=>[],
			shipping=>{},
			}
		],
		discount_percent=>0,
		customer_ip=>'',
		order_id=>'',
		netsuite_lead_id=>$id,
	};
	my $addr;
	if ($cr->{addressbookList}) {
		foreach my $entry (@{$cr->{addressbookList}}) {
			if ($entry->{defaultShipping} eq "true") {
				$addr = $entry;
				last;
			}
		}
		if (!$addr) {
			$addr=$cr->{addressbookList}->[0];
		}
	}
	if ($addr) {
		$order_hash->{order_groups}->[0]->{shipping} = {
			addr1=>$addr->{addr1},
			addr2=>$addr->{addr2},
			city=>$addr->{city},
			state_prov=>$addr->{state},
			country=>Fap::Data::Countries->get_country_from_netsuite_name($addr->{country}),
			postal=>$addr->{zip},
		};
	}
	if ($cr->{contactRolesList}) {
                my ($first,@last) = split(/ /,$cr->{contactRolesList}->[0]->{contactName});
                $order_hash->{first_name} = $first;
                $order_hash->{last_name} = join(" ",@last);
        }

	return $order_hash;
}

=head2 get_status_list

Get list of valid order status

Args:
Returns: hashmap of status'

=cut
sub get_status_list {
    my $fcs_schema    = Fap::Model::Fcs->new();
    return $fcs_schema->options("OrderStatus");
}

=head2 associate_server_id_to_order_group_id

Associates a server_id to a particular order_group_id

Args: order_group_id, server_id 
Returns: 1 for success, undef for error

=cut
sub associate_server_id_to_order_group_id
{
    my $fcs_schema     = Fap::Model::Fcs->new();
    my $order_group_id = shift;
    my $server_id      = shift;
    
    if ($fcs_schema->table('order_group')->search({
        order_group_id => $order_group_id,
        server_id      => undef
    })->update({
		server_id => $server_id
	}) > 0)
    {
        return 1;
    }

    Fap->trace_error('ERR: Unable to tie server to order_group_id');
    return undef;
}

=head2 reset_server_id_of_order_group_id

Resets the server_id of a particular order_group_id

Args: order_group_id
Returns: 1 for success, undef for error

=cut
sub reset_server_id_of_order_group_id
{
    my $fcs_schema     = Fap::Model::Fcs->new();
    my $order_group_id = shift;
    
    if ($fcs_schema->table('order_group')->search({
        order_group_id => $order_group_id
    })->update({
		server_id => undef
	}) > 0)
    {
        return 1;
    }

    Fap->trace_error('ERR: Unable to reset server to order_group_id');
    return undef;
}

1;
__DATA__
