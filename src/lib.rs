// Only run this as a WASM if the export-abi feature is not set.
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]

#[macro_use]
extern crate alloc;
mod utility;
mod verify_signature;

use crate::utility::{EriError::*, *};
use crate::verify_signature::verify;
use alloc::string::String;
use alloc::vec::Vec;
use alloy_primitives::{address, Address, FixedBytes};
use core::convert::Into;
use stylus_sdk::abi::Bytes;
use stylus_sdk::{alloy_primitives::U256, evm, prelude::*};

sol_interface! {
    interface IEri {
         function createItem(
            address user,
            string calldata name,
            string calldata unique_id,
            string calldata serial,
            uint256 date,
            address owner,
            string[] memory metadata,
            string calldata manufacturer_name
        ) external;
    }
}

sol_storage! {
    #[entrypoint]
    pub struct Authenticity {
        address owner;
        address ownership;

        mapping(address => string) manufacturers;
        mapping(string => address) names;
        mapping(address => address[]) authorised_retailers;
    }
}

impl Authenticity {
    fn address_zero_check(&self, caller: Address) -> Result<(), EriError> {
        if caller.is_zero() {
            return Err(AddressZero(ADDRESS_ZERO { zero: caller }));
        }
        Ok(())
    }

    fn only_owner(&self, caller: Address) -> Result<(), EriError> {
        if caller != self.owner.get() {
            return Err(OnlyOwner(ONLY_OWNER { user: caller }));
        }
        Ok(())
    }

    fn is_registered(&self, address: Address) -> Result<(), EriError> {
        if self.manufacturers.getter(address).is_empty() {
            return Err(NotRegistered(NOT_REGISTERED { user: address }));
        }
        Ok(())
    }
    fn is_manufacturer(&self, address: Address) -> Result<bool, EriError> {
        Ok(!self.manufacturers.getter(address).is_empty())
    }

    // fn is_an_authorised_retailer(
    //     &self,
    //     manufacturer: Address,
    //     retailer: Address,
    // ) -> Result<bool, EriError> {
    //     let retailers = self.authorised_retailers.getter(manufacturer);
    //
    //     let mut is_part = false;
    //
    //     for i in 0..retailers.len() {
    //         let each_retailer = retailers.getter(i).unwrap().get();
    //
    //         if each_retailer == retailer {
    //             is_part = true;
    //             break;
    //         }
    //     }
    //
    //     Ok(is_part)
    // }
}

#[public]
impl Authenticity {
    #[constructor]
    pub fn constructor(&mut self, ownership_addr: Address) -> Result<(), EriError> {
        self.ownership.set(ownership_addr);
        self.owner.set(self.vm().msg_sender());

        evm::log(ContractCreated {
            contractAddress: self.vm().contract_address(),
            owner: self.vm().tx_origin(),
        });

        Ok(())
    }

    pub fn manufacturer_registers(
        &mut self,
        manu_addr: Address,
        manu_name: String,
    ) -> Result<(), EriError> {
        self.only_owner(self.vm().msg_sender())?;

        self.address_zero_check(manu_addr)?;
        self.is_registered(manu_addr)?;

        if manu_name.len() < 3 {
            //to make sure the name is longer than 2 letters
            return Err(InvalidManufacturerName(INVALID_MANUFACTURER_NAME {
                name: manu_name.clone(),
            }));
        }

        if !self.names.get(manu_name.clone()).is_empty() {
            //to make sure name is unique
            return Err(NameNotAvailable(NAME_NOT_AVAILABLE {
                name: manu_name.clone(),
            }));
        }

        //save name against address
        self.manufacturers.setter(manu_addr).set_str(&manu_name);
        //save address against name
        self.names.setter(manu_name.clone()).set(manu_addr);

        evm::log(ManufacturerRegistered {
            manufacturerAddress: manu_addr,
            manufacturerName: manu_name.parse().unwrap(),
        });

        Ok(())
    }

    fn set_authorised_retailers(&mut self, retailer: Address) -> Result<(), EriError> {
        let caller = self.vm().msg_sender();

        self.is_registered(caller)?;
        self.address_zero_check(retailer)?;

        let mut retailers = self.authorised_retailers.setter(caller);

        retailers.push(retailer);

        Ok(())
    }

    fn get_manufacturer(&self, address: Address) -> Result<String, EriError> {
        if self.manufacturers.getter(address).is_empty() {
            return Err(DoesNotExist(DOES_NOT_EXIST {}));
        }

        Ok(self.manufacturers.getter(address).get_string())
    }

    fn verify_signature(
        &self,
        name: String,
        unique_id: String,
        serial: String,
        date: U256,
        owner: Address,
        metadata_hash: FixedBytes<32>,
        signature: Bytes,
    ) -> Result<bool, EriError> {
        if !self.is_manufacturer(owner)? {
            return Err(DoesNotExist(DOES_NOT_EXIST {}));
        }

        Ok(verify(
            name,
            unique_id,
            serial,
            date,
            owner,
            metadata_hash,
            signature,
        )?)
    }

    // fn retailers_make_owners(
    //     &mut self,
    //     user: Address,
    //     name: String,
    //     unique_id: String,
    //     serial: String,
    //     date: U256,
    //     owner: Address,
    //     metadata: Vec<String>,
    //     metadata_hash: FixedBytes<32>,
    //     signature: Bytes,
    // ) -> Result<(), EriError> {
    //
    //     let caller = self.vm().msg_sender();
    //     self.address_zero_check(user)?;
    //
    //     if !self.is_an_authorised_retailer(owner, caller)? {
    //         return Err(UnauthorisedRetailer(UNAUTHORISED{retailer: caller}))
    //     }
    //
    //     let manufacturer = self.get_manufacturer(owner)?;
    //
    //     let ownership = IEri::new(self.ownership.get());
    //
    //     match self.verify_signature(
    //         name.clone(),
    //         unique_id.clone(),
    //         serial.clone(),
    //         date,
    //         owner,
    //         metadata_hash,
    //         signature,
    //     ) {
    //         Ok(_) => Ok(ownership
    //             .create_item(
    //                 self,
    //                 user,
    //                 name,
    //                 unique_id,
    //                 serial,
    //                 date,
    //                 owner,
    //                 metadata,
    //                 manufacturer,
    //             )
    //             .unwrap()),
    //         Err(_) => Err(ClaimFailed(CLAIM_FAILED {})),
    //     }
    // }

    fn verify_authenticity(
        &self,
        name: String,
        unique_id: String,
        serial: String,
        date: U256,
        owner: Address,
        metadata_hash: FixedBytes<32>,
        signature: Bytes,
    ) -> Result<(bool, String), EriError> {
        match self.verify_signature(
            name.clone(),
            unique_id.clone(),
            serial.clone(),
            date,
            owner,
            metadata_hash,
            signature,
        ) {
            Ok(is_valid) => Ok((is_valid, self.manufacturers.get(owner).get_string())),
            Err(_) => Err(InvalidSignature(INVALID_SIGNATURE {})),
        }
    }
}

// #[cfg(test)]
// mod test {
//     use super::*;
//     use alloc::string::ToString;
//     use stylus_sdk::console;
//     use stylus_sdk::testing::*;
//
//     #[test]
//     fn test_manufacturer_registers() {
//         let vm = TestVM::default();
//         let mut contract = Authenticity::from(&vm);
//
//         let _result = contract.manufacturer_registers("SAMSUNG".to_string());
//
//         match contract.get_manufacturer_address_by_name(String::from("SAMSUNG")) {
//             Ok(manufacturer_address) => match contract.get_manufacturer(manufacturer_address) {
//                 Ok(manu) => {
//                     assert_eq!(manu.0, String::from("SAMSUNG"));
//                 }
//                 _ => console!("Error!"),
//             },
//             _ => console!("Error!"),
//         }
//     }
// }
//
// deployed code at address: 0xc76493af47eb5738c93567373c8f7e305c390755
