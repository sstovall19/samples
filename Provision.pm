=head1 NAME

F::Provision;

=head1 SYNOPSIS

  use F::Provision;

=head1 DESCRIPTION

Library functions for managing customer information

=head1 FUNCTIONS

API functions available in this library

=cut

package F::Provision;

use F::Globals;

use Exporter;
@ISA = qw/Exporter/;
@EXPORT = qw/
provision_customer
provision_server
deprovision_customer
deprovision_server
/;

use strict;
use HTML::Template;
use F::Database;
use F::User;
use F::Globals;
use F::Globals::Trixbox;
use F::Customer;
use F::Server;
use F::Util;
use F::Lock;
use F::Unbound;
use F::Inphonex;
use F::ConfIO;
use F::Upgrade::TollRestriction;
use F::Reasons;
use F::Upgrade;
use F::Upgrade::hud3;
use F::LiveBackupServer;

use LWP::UserAgent;

=head2 provision_customer

=over 4

Provision a new customer

    Args: [dbh],info_hashref
 Returns: customer_id | undef=Error

 Example: provision_customer($dbh, 
	{
		name => "ABC, Inc."
	}
 );

=back

=cut
##############################################################################
# provision_customer
##############################################################################
sub provision_customer
{
	my($dbh) = &F::Database::shift_check_dbh;
	my($hr) = shift(@_);
	my($subname) = 'F::Provision::provision_customer';

	unless(defined($hr)) {
		$@ = "provision_customer: customer_info_hashref missing";
		return(undef);
	}

	my($customer_id) = F::Customer::add_customer($dbh,$hr);

	return($customer_id);
}

=head2 deprovision_customer

=over 4

Deprovision a customer. Simply removes them from the database. In the future
this should hunt for all servers, and clean everything out.

    Args: [dbh],customer_id
 Returns: 1=success | undef=Error

 Example: deprovision_customer($dbh,33);

=back

=cut
##############################################################################
# deprovision_customer
##############################################################################
sub deprovision_customer
{
	my($dbh) = &F::Database::shift_check_dbh;
	my($customer_id) = shift(@_);
	my($subname) = 'F::Provision::deprovision_customer';

	unless($customer_id =~ /^\d+$/) {
		$@ = "$subname: Missing customer_id argument. Must be numeric.";
		return(undef);
	}

	# Remove the customer
	my($rv) = F::Customer::remove_customer($dbh,$customer_id);
	unless($rv) {
		$@ = "$subname: Deprovision failed: $@";
		return(undef);
	}

	return(1);
}

=head2 provision_server

=over 4

Provision a server.

Optionally pass a server_id (if on trixbox) to specify the server ID to use.

    Args: [dbh],info_hashref
 Returns: server_id | undef=Error

 Example: deprovision_server($dbh,
 	{
		'customer_id' => 33
	}
 );

=back

=cut
##############################################################################
# provision_server
##############################################################################
sub provision_server
{
	use Sys::Hostname;

	my($dbh) = &F::Database::shift_check_dbh;
	my($hr) = shift(@_);
	my $debughr = shift; # Debug hash ref
	my $pbxtra_version = shift || '5.2';	# default to latest version

	my($subname) = 'F::Provision::provision_server';
	my($gateway) = 'proxy1.pbxtra.fonality.com';
	my($iax_conf) = '/etc/asterisk/iax.conf';

	unless(ref($hr) eq 'HASH') {
		$@ = "$subname: requires info_hashref parameter";
		return(undef);
	}

	my $basehost;
	my $localhost = hostname;
	if ($localhost =~ /^pbl|^tb/)
	{
		$basehost = 'trixbox';
	}
	else
	{
		$basehost = 'pbxtra';
	}

	my(@required_params) = qw(
		customer_id
		service_tag
	);
	foreach my $a (@required_params) {
		unless(defined($hr->{$a})) {
			$@ = "$subname: required info hashref param '$a' missing";
			return(undef);
		}
	}

	my ($server_id, $ip1, $ip2, $rv);
	my($base1, $base2);
	# Do this only if we aren't in debug mode
	if (!defined($debughr))
	{
		my($part1,$part2,$part3,$new_part3,$part4,$new_part4);

		# do we already have a server id?
		if ($basehost eq 'trixbox')
		{
			if ($hr->{'server_id'})
			{
				# if this is an unbound server, use our host ip
				if($hr->{'unbound'})
				{
					# set 'unbound' to whatever the host server id is
					$hr->{'unbound'} = $hr->{'host'} || F::Unbound::get_current_host_server_id({'name' => $hr->{'pbxtra_type'}});
					($ip1,$ip2) = F::Unbound::get_host_tun_ip($dbh, $hr->{'unbound'});
				}
				else
				{
					$ip1 = generate_tun_ip_from_server_id($hr->{'server_id'}, $basehost);
					$ip2 = $ip1;
					$ip2 =~ s/^(\d+)/$1 + 1/eg;
				}
			    
			    ($base1) = ($ip1 =~ /^(.*)\.\d+$/);
			    ($base2) = ($ip2 =~ /^(.*)\.\d+$/);
			    $server_id = $hr->{'server_id'};
			}
			else
			{
				$@ = "$subname: server_id must be passed for $basehost configurations";
				return undef;
			}
		}
		elsif ($basehost eq 'pbxtra')
		{
			# Get the next available server id.
			$server_id = get_max_server_id($dbh);
			$server_id++; # Increment the server_id

			if($hr->{'unbound'})
			{
			    # dev
			    my $prod_dbh = F::Database::mysql_connect();
				$hr->{'unbound'} = $hr->{'host'} || F::Unbound::get_current_host_server_id({'name' => $hr->{'pbxtra_type'}});
			    ($ip1,$ip2) = F::Unbound::get_host_tun_ip($prod_dbh, $hr->{'unbound'});
			}
			else
			{
				# Tunnel addresses are generated based on MAX(server_id)+1,
				# but the final server_id is returned by F::Server::add_server 
				# and it may be different. It's possible for two servers to be
				# provisioned with the same tunnel addresses, but different ids.
			    $ip1 = generate_tun_ip_from_server_id($server_id, $basehost);
			    $ip2 = $ip1;
			    $ip2 =~ s/^(\d+)/$1 + 1/eg;
			}

			print "$ip1, $ip2\n";

			($base1) = ($ip1 =~ /^(.*)\.\d+$/);
			($base2) = ($ip2 =~ /^(.*)\.\d+$/);
		}
	}
	# Otherwise get the data from the debug info passed in
	else
	{
		$ip1 = $debughr->{'ip1'};
		$ip2 = $debughr->{'ip2'};
		$server_id = $debughr->{'server_id'};
	}

	# Determine whether we are LBS or not
	my $lbs_main = F::LiveBackupServer::get_original_main($dbh, $server_id);
	my $provisioning_lbs_backup = ($lbs_main && $lbs_main != $server_id) ? 1 : 0;
	my $primary_server_info = ($lbs_main) ? F::Server::get_server_info($dbh, $lbs_main) : undef;

	# Set up the rest of the server_info hashref
	$hr->{'server_id'} = $server_id;
	$hr->{'ip_address'} = '0.0.0.0';

	# unbound uses the auth of the host
	if ($hr->{unbound} && $hr->{host})
	{
		my $host_info = F::Server::get_server_info($dbh, $hr->{host});
		$hr->{$_} = $host_info->{$_} for qw(remote_auth_username remote_auth_password);
	}
	# Use random user/pass for trixbox here
	elsif ($basehost eq 'trixbox')
	{
		if ($provisioning_lbs_backup)
		{
			# Use primary RPC credentials for the backup server
			$hr->{'remote_auth_username'} = $primary_server_info->{'remote_auth_username'};
			$hr->{'remote_auth_password'} = $primary_server_info->{'remote_auth_password'};
		}
		else
		{
			# This has to go down via setup.tmpl. Don't use odd characters from return_random_password()
			$hr->{'remote_auth_username'} = F::Util::return_random_string(12);
			$hr->{'remote_auth_password'} = F::Util::return_random_string(12);
		}
	}
	else
	{
		# The default.tar contains these values
		$hr->{'remote_auth_username'} = F::RPC::kDEFAULT_AUTH_USERNAME();
		$hr->{'remote_auth_password'} = F::RPC::kDEFAULT_AUTH_PASSWORD();
	}

	$hr->{'remote_auth_realm'} = 'SecuredRPC';
	$hr->{'check_with_ping'} = 1;
	$hr->{'tun_address'} = $ip1;
	$hr->{'tun_address2'} = $ip2;

	$hr->{'iax2_username'} = 's' . $server_id;
	$hr->{'iax2_password'} = F::Util::return_random_string(8);
	$hr->{'cp_version'}    = F::Globals::kCP_VERSION;

	# just use random number for connect and pbxtra
	$hr->{'ftp_password'} = F::Util::return_random_number(8);

	if (!defined($debughr))
	{
		my $zone_id = 3;
		my $hosts_dbh = F::Database::mydns_connect_internal();
		my $create_a = $hosts_dbh->prepare("INSERT INTO rr SET name = ?, data = ?, type = 'A', zone = ?");
		$create_a->execute("pbxtra${server_id}", $ip1, $zone_id);
		$create_a->execute("pbxtra${server_id}-2", $ip2, $zone_id);
		$create_a->execute("trixbox${server_id}", $ip1, $zone_id);
		$create_a->execute("trixbox${server_id}-2", $ip2, $zone_id);

		# unbound servers NO MESSING WITH VTUND!, 
		# but put entries into myDNS b/c ping.cgi won't do it for unbound
		if ($hr->{'unbound'})
		{
		    my $zone_id = ($server_id >= 100000) ? 2 : 1;

		    # put the main 'host' server id into the myDNS tables
		    my $host_ip = F::Unbound::get_host_server_ip($hr->{'unbound'});
		    my $dns_dbh = F::Database::mydns_connect();

		    my $create_cname = $dns_dbh->prepare("insert into rr set data = ?, name = ?, type = 'CNAME', zone = ?, ttl = 14400");
		    $create_cname->execute("s${server_id}i","s${server_id}",$zone_id);

		    my $insert_rr = $dns_dbh->prepare("insert into rr set data = ?, name = ?, type = 'A', zone = ?");
		    $insert_rr->execute($host_ip,"s${server_id}x", $zone_id);
		    $insert_rr->execute($host_ip,"s${server_id}i", $zone_id);
		}
		else
		{
			# generate a vtun password
			my $tun_password = F::Util::return_random_string(30);

			# chars should be alphanumeric
			$tun_password =~ s/[^\da-zA-Z]//g;

			# set our password to be stored in database
			$hr->{'tun_password'} = $tun_password;

			F::Provision::provision_tunnels ( $basehost, $server_id, $ip1, "$base1.1", $ip2, "$base2.1", $tun_password );
		}
	}

	if (!defined($debughr) || (defined($debughr) && !-e "/etc/fonality/$debughr->{'server_id'}"))
	{
		#Unpack the default config directory, and expand the template files
		my($dir) = '/etc/fonality';
		my($default_tar) = 'default.tar';

		# Unbound uses Asterisk 1.6
		if ($hr->{'unbound'})
		{
			$default_tar = 'default-1.6.tar';
		}

		if(defined($pbxtra_version) && $pbxtra_version ne '')
		{
			if($pbxtra_version ne '4.1')
			{
				$default_tar = 'default'.$pbxtra_version.'.tar';
			}
		}

		unless(-f "${dir}/${default_tar}") {
			$@ = "$subname: ${dir}/${default_tar} missing";
			return(undef);
		}
		$rv = chdir($dir);
		unless($rv) {
			$@ = "$subname: Unable to chdir to $dir: $!: $@";
			return(undef);
		}
		# Unpack, but not over an existing dir
		if(-x 'default') {
			rename('default', "default.$$." . time());
		}

		# Allow multiple instances of this to run
		mkdir("default.${server_id}");
		$rv = system("/bin/tar -C ${dir}/default.${server_id} -xf ${dir}/${default_tar}");
		unless($rv == 0) {
			$@ = "$subname: Unable to unpack $dir/$default_tar: $!";
			return(undef);
		}
		if ($hr->{'unbound'})
		{
			# check if there is unbound specific tar
			my $unbound_tar = "default.unbound.tar";
			if(defined($pbxtra_version) && $pbxtra_version ne '')
			{
				$unbound_tar = "default" . $pbxtra_version . ".unbound.tar";
			}
			if(-f "${dir}/".$unbound_tar)
			{
				$rv = system("/bin/tar -C ${dir}/default.${server_id} -xf ${dir}/". $unbound_tar);
				unless($rv == 0) {
					$@ = "$subname: Unable to unpack $dir/$unbound_tar: $!";
					return(undef);
				}
			}
		}


		# Prevent a directory in the existing correct location from being there -- it's ok if this fails
		if (-e $server_id)
		{
			$rv = rename($server_id, "${server_id}." . time());
		}

		# Move the directory to the correct location
		$rv = rename("default.${server_id}/default", $server_id);
		unless($rv) {
			$@ = "$subname: Unable to rename 'default' to $server_id in $dir: $!";
			return(undef);
		}

		# Remove our temp directory which allowed multiple instances of us to run
		rmdir("default.${server_id}");

		# Generate a unique blowfish key
		if (!$hr->{'unbound'} && open(RAND, "</dev/urandom"))
		{
			my $key;
			read(RAND, $key, 39);
			close(RAND);

			# get hex
			$key = uc(unpack("H*", $key));

			# use ConfIO
			my $ioh = F::ConfIO->new({server => $server_id, file => "key", use_cache => 1});
			$ioh->write;
			$ioh->clear;
			$ioh->append($key."\n");
			$ioh->close;
			#open(KEY, ">/etc/fonality/${server_id}/key");
			#print KEY "$key\n";
			#close(KEY);
		}

		# Edit the files needing customization
		$dir = "/etc/fonality/${server_id}";
		$rv = chdir($dir);
		unless($rv) {
			$@ = "$subname: Unable to chdir to $dir: $!: $@";
			return(undef);
		}
		
		$rv = _populate_template("${dir}/sip.conf",
			{
				'IP' => $ip2
			}
		);
		unless($rv) {
			$@ = "$subname: $@";
			return(undef);
		}
		$rv = _populate_template("${dir}/voicemail.conf",
			{
				'SERVER_ID' => $server_id
			}
		);
		unless($rv) {
			$@ = "$subname: $@";
			return(undef);
		}
		$rv = _populate_template("${dir}/iax.conf",
			{
				'IAX2_USERNAME' => $hr->{'iax2_username'},
				'IAX2_PASSWORD' => $hr->{'iax2_password'}
			}
		);
		unless($rv) {
			$@ = "$subname: $@";
			return(undef);
		}
		F::IAX::add_iax_static($server_id);

		$rv = _populate_template("${dir}/fonality/globals.conf",
			{
				'SERVER_ID' => $server_id,
				'IAX2_USERNAME' => $hr->{'iax2_username'},
				'IAX2_PASSWORD' => $hr->{'iax2_password'},
				'GATEWAY' => $gateway,
				'AREA_CODE' => $hr->{'area_code'}
			}
		);
		unless($rv) {
			$@ = "$subname: $@";
			return(undef);
		}

		# generate the pass for local and remote mgr
		my $localpass = _gen_pass();
		my $remotepass = _gen_pass();

		# use the default pass for unbound
		if($hr->{'unbound'})
		{
			$localpass = '0chanc3yo';
			$remotepass = '0chanc3yo';
		}

		# if this is LBS, use the primary details
		if ($provisioning_lbs_backup) {
			$localpass = $primary_server_info->{'local_mgr_password'};
			$remotepass = $primary_server_info->{'remote_mgr_password'};
		}

		$rv = _populate_template("${dir}/manager.conf",
			{
				'LOCAL_PASS' => $localpass,
				'REMOTE_PASS' => $remotepass
			}
		);
		unless($rv) {
			$@ = "$subname: $@";
			return(undef);
		}

		# Put an entry for this server into iax.conf
		my $lock = F::Lock->new({file => $iax_conf, type => 'write'});
		if (!defined($lock))
		{
			$@ = "$subname: Cannot write lock $iax_conf.";
			return undef;
		}
		
		$rv = open(IAX,">>$iax_conf");
		unless($rv) {
			$lock->unlock;
			$@ = "$subname: Error opening $iax_conf: $!";
			return(undef);
		}

		print IAX "\n[s$server_id]\n";
		print IAX "type=friend\n";
		#print IAX "host=s${server_id}x.pbxtra.fonality.com\n";
		print IAX "host=$ip1\n";
		print IAX "secret=" . $hr->{'iax2_password'} . "\n";
		print IAX "context=pbxtra\n";
		print IAX "accountcode=$server_id; server_id\n";
		close(IAX);
		$lock->unlock;

		#$rv = system("/usr/sbin/asterisk -r -x reload > /dev/null");
		#unless($rv == 0) {
		#	$@ = "$subname: Error reloading $iax_conf: $!";
		#	return(undef);
		#}
		#system("scp -qp $iax_conf pbxtra1001:/etc/asterisk/iax.conf");
		#system("ssh pbxtra1001 asterisk -r -x reload > /dev/null");
		
		# Add the server to the database; allow it to get vtuns
		$server_id = F::Server::add_server($dbh,$hr);
		if (!$hr->{'unbound'})
		{
			F::Server::set_server_info($dbh, { server_id => $server_id, tun_credential_access => 1 });
		}

		# do post processing for pbxtra version 5.1, set the localpass and remotepass
		if ($server_id && $pbxtra_version >= 5.1)
		{
			my $asterisk_version = '1.6.0.28-samy-r89';

			#
			#       NOTE: Place all code that touches RPC here!!!
			#
			#       trixbox does not have vtun up and running at this point, so
			#       activation will timeout and FAIL if you try to do RPC.
			#
			unless ($basehost eq 'trixbox')
			{
				F::Upgrade::TollRestriction::config_basic_human_rights($dbh, $server_id);
				F::Reasons::add_default_reasons($dbh, $server_id);

				# Make sure we can connect before blithely assuming we can
				my $rpc = F::RPC::rpc_connect($server_id, $dbh, $hr);
				if ($rpc)
				{
					my $tmp = F::Upgrade::check($rpc, $server_id, 'astver');
					if ($tmp)
					{
						my $astv = (split /\s/, $tmp)[1];
						if(defined($astv) && $astv ne '')
						{
							$asterisk_version = $astv;
						}
					}
				}
			}

			F::Server::set_server_info($dbh, {
				server_id       => $server_id,
				remote_mgr_password => $remotepass,
				local_mgr_password  => $localpass,
				asterisk_version    => $asterisk_version,
				mp3_moh             => 0,
				use_db_conf         => 1,
				cp_version          => $pbxtra_version,
				cp_location         => F::Upgrade::get_cp_location(F::Globals::kCP_VERSION()),
			});

			# set the hud35 policy
			unless($hr->{'unbound'})
			{
				F::Upgrade::hud3::hud35($dbh, $server_id);
			}
		}
	}

	return $server_id;
}

# helper function to generate random pass
sub _gen_pass
{
	my $length = shift || 20;
	my @chars = ('A' .. 'Z', 'a' .. 'z', 0 .. 9);
	return join("", map { $chars[int(rand(@chars))] } 1 .. $length);
}


=head2 generate_tun_ip_from_server_id

=over 4

Return primary tunnel address for a server ID.

    Args: server_id, trixbox | pbxtra
 Returns: ip | undef if error

 Example: generate_tun_ip_from_server_id($server_id, 'trixbox');

=back

=cut

##############################################################################
# generate_tun_ip_from_server_id
##############################################################################
sub generate_tun_ip_from_server_id
{
	my ($server_id, $type) = @_;

	my $sid_offset;
	if ($type eq 'trixbox')
	{
		# since we didn't start our IP range at server 1, we need an offset to work
		# by. we started 1.0.0.0 range at server 100146, so that is our offset.
		$sid_offset = 100146;
	}
	elsif ($type eq 'pbxtra')
	{
		$sid_offset = -8285422;
	}
	else
	{
		$@ = "Unable to generate IPs for server $server_id for $type: unknown type";
		return undef;
	}

	# generate the decimal equivalent of the IP address (network byte order)
	# add 2 ** 24 (1.0.0.0)
	# subtract 100146 (server ID 100146 is the first server we used in the 1.0.0.0 block)
	# add the current server ID to get the correct offset
	my $decimal = 2 ** 24 - $sid_offset + $server_id;

	# how many IPs we need to reserve (in this case, we need to reserve .0, .1 and .255)
	my $reserve = 3;

	# by default, the reservations will begin at .255 and move backwards, so
	# reserving 3 IPs reserves .253 - .255. by setting this reservation offset
	# to -2, we reserve .255, .0 and .1.
	my $reserve_offset = -2;

	# we can't use .0, .1 and .255 in any range, so we need to find out the number of
	# blocks of 253 IPs (256 minus the 3 IPs), and add 3 * [that number] to
	# the IP (so 255 ends up 258, which is really .2)
	#
	# this is where we use the # of IPs to reserve and the offset of where to begin
	# the reservations from
	$decimal += $reserve * int(($server_id - $sid_offset + $reserve_offset) / (256 - $reserve));

	# convert the decimal to ascii, then unpack the ascii into 4 individual bytes
	my @quad = unpack("C4", pack("N", $decimal));

	# join the four bytes to create our dotted quad ip address!
	my $ip = join(".", @quad);

	return $ip;
}


=head2 deprovision_server

=over 4

Deprovision a server. Not yet implemented.

    Args: [dbh],server_id
 Returns: 1=success | undef=Error

 Example: deprovision_server($dbh,1000);

=back

=cut

##############################################################################
# deprovision_server
##############################################################################
sub deprovision_server
{
	my($dbh) = &F::Database::shift_check_dbh;
	my($server_id) = shift(@_);
	my($subname) = 'F::Provision::deprovision_server';

	$@ = "$subname: Not yet implemented";
	return(undef);
}

##############################################################################
# _populate_template
#
#    Args: template_file, template_param_hashref
# Returns: 1=success, undef=Error
##############################################################################
sub _populate_template
{
	my($tmpl_file) = shift(@_);
	my($params) = shift(@_);
	my($subname) = 'F::Provision::_populate_template';

=comment
	unless(-f $tmpl_file) {
		$@ = "$subname: Template file: $tmpl_file does not exist!";
		return(undef);
	}
=cut

	unless(ref($params) eq 'HASH') {
		$@ = "$subname: required hashref parameter missing!";
		return(undef);
	}
	my($template) = HTML::Template->new(filename => $tmpl_file, die_on_bad_params => 0);
	unless($template) {
		$@ = "$subname: unable to set up template: $tmpl_file: $!";
	}
	$template->param($params);
	my($output) = $template->output; # print the template

	# use ConfIO
	$tmpl_file =~ /\/etc\/fonality\/(\d+)\/(.*)/;
	my $server_id = $1;
	my $file = $2;
	if(defined($server_id) && defined($file))
	{
		my $ioh = F::ConfIO->new({server => $server_id, file => $file, use_cache => 1, RaiseError => 1});
		$ioh->write;
		$ioh->clear;
		$ioh->append($output);
		$ioh->close;
	}
	else
	{
		my $lock = F::Lock->new({file => $tmpl_file, type => 'write'});
		if (!defined($lock))
		{
			$@ = "$subname: Could not get write lock on $tmpl_file.";
			return undef;
		}

		my($rv) = open(local(*TMPL), ">$tmpl_file");
		print TMPL $output;
		close(TMPL);
		$lock->unlock;
	}

	return(1);
}


##############################################################################
# provision_virtual_number
# 
# Use this method if there is already a virtual_number and DID on Inphonex
# and you just want to provision a device to it.
#
# Args: dbh, server_id, did, [didlist]
##############################################################################
sub provision_virtual_number
{
    my ($dbh,$sid,$did,$did_list) = @_;

    my $customer_info = F::Customer::get_customer_info_by_server_id($dbh,$sid);

	# if we have a cached did_list, no need to ping Inphonex
	unless($did_list)
	{
		my $inphonex = F::Inphonex->new('test_mode' => 'false', 'dbh' => $dbh, 'server_id' => $sid);
		# find the inphonex customer id ($customer_info->{inphonex_id})
		$did_list = $inphonex->did_list($customer_info->{inphonex_id});
    }

    # find the right virtual_number that matches that DID
    if(ref($did_list->{dids}) ne 'ARRAY')
    {
	$did_list->{dids} = [$did_list->{dids}];
    }

    for my $d (@{$did_list->{dids}})
    {
	if($did eq $d->{did})
	{
	    # provision that virtual number
	    add_unbound_trunks($dbh,$sid,$did,$d->{virtual_number},$customer_info->{inphonex_pw});
	    
	    # return the did_list in case we need to use it again, but we don't want to hit Inphonex again
	    return($did_list);
	    last;
	}
    }

    # if we couldn't find that DID in inphonex, return 0
    return 0;
}

#############################################################################
# add_unbound_trunks
#
# puts the trunks into sip.conf
#
# Args: dbh, server_id, did, virtual_number, password
############################################################################
sub add_unbound_trunks
{
    my($dbh,$sid,$did,$vn,$pw) = @_;
    my $inphonex_host = 'sip.inphonex.com';

    my $voip = F::VOIP->new($dbh,$sid);
    my $voip_name = "FonalityVoIP-$sid-$vn";
    $voip->add_voip_account($voip_name,'SIP','unbound');
    $voip->add($voip_name,'fromuser', $vn);
    $voip->add($voip_name,'secret',$pw);
    $voip->add($voip_name,'username', $vn);
    $voip->add($voip_name,'disallow','all');
    $voip->add($voip_name,'allow','g729');
    $voip->add($voip_name,'allow','ulaw');
    $voip->add($voip_name,'allow','alaw');
    $voip->add($voip_name,'allow','gsm');
    $voip->add($voip_name,'sendrpid','no');
    $voip->add($voip_name,'context','incoming');
    $voip->add($voip_name,'dtmfmode','inband');
    $voip->add($voip_name,'insecure','very');
    $voip->add($voip_name,'nat','no');
    $voip->add($voip_name,'canreinvite','no');
    $voip->add($voip_name,'qualify','no');
    $voip->add($voip_name,'auth','plaintext');
    $voip->add($voip_name,'tos','reliability');
    $voip->add($voip_name,'fromdomain',$inphonex_host);
    $voip->add($voip_name,'type','friend');
    $voip->add($voip_name,'host',$inphonex_host);

    $voip->commit();
}


##############################################################################
# add_mx_records
#
#    Args: server_id
# Returns: 1=success, undef=Error
##############################################################################
sub add_mx_records
{
	my ($server_id) = shift;

	if ($server_id !~ /^\d+$/)
	{
		$@ = "Must pass a valid server ID";
		return undef;
	}

	my $dbh = mydns_connect();
	return undef unless $dbh->do("
		INSERT INTO rr(zone, name, type, data, aux) VALUES
			('1', 's${server_id}',  'MX', 's${server_id}x', 10),
			('1', 's${server_id}x', 'MX', 's${server_id}x', 10),
			('1', 's${server_id}i', 'MX', 's${server_id}x', 10)
	");

	return 1;
}

=head2 determine_software

Determine PBXtra Software version.

=cut

sub determine_software {
    my $order = shift;
    
    my ($pbxtratype);
    if (ref($order) eq "HASH") {
        # regular PBXtra
        ($pbxtratype) = grep { $_->{group_name} eq "PBXtra Software" } @{ $order->{items} };
        # UNBOUND
        if (!$pbxtratype) {
            ($pbxtratype) =
              grep { $_->{group_name} eq "PBXtra UNBOUND User Licenses" } @{ $order->{items} };
        }
        # Connect
        if (!$pbxtratype) {
            ($pbxtratype) =
              grep { $_->{group_name} eq "Connect Australia User Licenses" } @{ $order->{items} };
        }
        # still can't find PBXtra version?
        if (!$pbxtratype) {
            print "ERROR: Unable to determine PBXtra version!\n";
            print "There may be other inaccuracies with this order!\n\n";
        }
    }
    return $pbxtratype;
}

=head2 provision_tunnel

Add a tunnel or 2 to the tunnel servers

=cut

sub provision_tunnels
{
	my ($stype, $sid, $ip1, $base1, $ip2, $base2, $tun_password ) = @_;

        my %tun_data = ( 'stype' => $stype,
                         'auth' => "hsiane6434bGdjs9303ndjjalL",
                         'sid' => $sid,
                         'tun_password' => $tun_password,
                         'ip1' => $ip1,
                         'ip2' => $ip2,
                         'base1' => $base1,
                         'base2' => $base2 );
	my $host = "tbp-vpn";
	if ( $stype =~ /pbxtra/ )
	{
		$host = "vpn";
	}
		
	_provision_tunnel ( "http://${host}1.fonality.com/new", \%tun_data );
	_provision_tunnel ( "http://${host}2.fonality.com/new", \%tun_data );
}

sub _provision_tunnel
{
	my ($url,$tun_data) = @_;
	my $ua = LWP::UserAgent->new;
 	$ua->timeout(60);

 	my $response = $ua->post($url,$tun_data);

 	if ($response->is_success) {
		return $response->decoded_content eq "ok";
 	}
 	else 
	{
    		die $response->status_line;
 	}
}

1;
